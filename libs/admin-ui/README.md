# admin-ui

The admin's [spartan-ng](https://spartan.ng) helm components, copied into the repository so they can be read and changed. Each component is a secondary entry point imported as `@spartan-ng/helm/<name>`, such as `@spartan-ng/helm/button`. The public site doesn't use them.

Add a component with the spartan CLI, which reads `components.json` at the workspace root:

```bash
npx nx g @spartan-ng/cli:ui <name>
```

The theme lives in `apps/admin/src/styles.css`, which also points Tailwind at this library with `@source`.
