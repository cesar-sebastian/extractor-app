export function LogoutForm() {
  return (
    <form action="/api/auth/logout" method="post">
      <button type="submit">Salir</button>
    </form>
  );
}
