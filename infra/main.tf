# Design only. Do not run terraform apply.
# There is no remote state in this file. Applying it would be a later step:
# a state bucket, in an account that is not a personal one.
# What actually runs is docker compose. This is the AWS map the brief asks for.

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "vpc_id" {
  type        = string
  description = "Existing VPC. This file does not draw subnets, NAT, or route tables."
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "At least two private subnets. The task has no public IP."

  validation {
    condition     = length(var.private_subnet_ids) >= 2
    error_message = "RDS needs two subnets in different availability zones."
  }
}

variable "image" {
  type        = string
  description = "Image built from the Dockerfile. Not a public URL of this take-home."
}

# Values are loaded outside git. This file only names the secrets.

resource "aws_secretsmanager_secret" "anthropic_api_key" {
  name        = "applica/anthropic-api-key"
  description = "Anthropic API key. The value is not in this file."
}

resource "aws_secretsmanager_secret" "database_url" {
  name        = "applica/database-url"
  description = "postgres URL for applica_app. Includes the password. Not in this file."
}

resource "aws_secretsmanager_secret" "database_migration_url" {
  name        = "applica/database-migration-url"
  description = "postgres URL for the migration role. Not in this file."
}

resource "aws_secretsmanager_secret" "auth_secret" {
  name        = "applica/auth-secret"
  description = "JWT signing secret. Not in this file."
}

resource "aws_ecs_cluster" "app" {
  name = "applica"
}

# 14 days of operational logs. The 30-day wipe of message text is a script
# against Postgres, not this file.
resource "aws_cloudwatch_log_group" "app" {
  name              = "/applica/app"
  retention_in_days = 14
}

resource "aws_iam_role" "execution" {
  name               = "applica-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

resource "aws_iam_role" "task" {
  name               = "applica-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

data "aws_iam_policy_document" "ecs_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "read_secrets" {
  name = "read-secrets"
  role = aws_iam_role.execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["secretsmanager:GetSecretValue"]
      Resource = [
        aws_secretsmanager_secret.anthropic_api_key.arn,
        aws_secretsmanager_secret.database_url.arn,
        aws_secretsmanager_secret.database_migration_url.arn,
        aws_secretsmanager_secret.auth_secret.arn,
      ]
    }]
  })
}

resource "aws_security_group" "app" {
  name        = "applica-app"
  description = "Fargate task. No inbound rule: this file has no load balancer."
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "db" {
  name        = "applica-db"
  description = "Postgres accepts the task only."
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }
}

resource "aws_db_subnet_group" "app" {
  name       = "applica"
  subnet_ids = var.private_subnet_ids
}

resource "aws_db_instance" "app" {
  identifier        = "applica"
  engine            = "postgres"
  engine_version    = "16"
  instance_class    = "db.t4g.micro"
  allocated_storage = 20
  db_name           = "applica"
  username          = "applica"

  # AWS stores the master password in Secrets Manager. It is not an argument here.
  manage_master_user_password = true

  db_subnet_group_name    = aws_db_subnet_group.app.name
  vpc_security_group_ids  = [aws_security_group.db.id]
  publicly_accessible     = false
  deletion_protection     = true
  skip_final_snapshot     = false
  backup_retention_period = 7
}

resource "aws_ecs_task_definition" "app" {
  family                   = "applica"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = var.image
      essential = true
      portMappings = [
        { containerPort = 3000, protocol = "tcp" }
      ]
      environment = [
        { name = "LLM_MODEL", value = "claude-haiku-5-5" },
        { name = "LLM_PROVIDER", value = "anthropic" },
        { name = "PROMPT_VERSION", value = "extract-v4" },
        { name = "NODE_ENV", value = "production" },
      ]
      secrets = [
        { name = "ANTHROPIC_API_KEY", valueFrom = aws_secretsmanager_secret.anthropic_api_key.arn },
        { name = "DATABASE_URL", valueFrom = aws_secretsmanager_secret.database_url.arn },
        { name = "DATABASE_MIGRATION_URL", valueFrom = aws_secretsmanager_secret.database_migration_url.arn },
        { name = "AUTH_SECRET", valueFrom = aws_secretsmanager_secret.auth_secret.arn },
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.app.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "app"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "app" {
  name            = "applica"
  cluster         = aws_ecs_cluster.app.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.app.id]
    assign_public_ip = false
  }
}
