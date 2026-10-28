# QA — landing-admin
- Unit: API 361 ✓ (nuevos: guard, controller, servicios, reader), admin 14 ✓, landing 3 ✓, shared 78 ✓.
- HTTP real (stack local): `/api/admin/metrics` 401 sin token, 403 usuario, 200 admin, 400 params inválidos.
- Navegador (verify-new-apps.ts): anónimo → /login; sin rol → rechazado, sin cookie, sin acceso; admin → panel; salir → sin acceso.
- axe WCAG 2.2 AA: 0 serias en landing (/, /privacy, desktop y mobile) y admin (login, resumen, usuarios). Se corrigieron 2 (contraste dorado sobre navy; aria-label en div sin rol).
- Responsive: sin scroll horizontal a 375/390 y 1440.
- Reporte: `reviews/2026-10-27-landing-admin-qa.md`.
