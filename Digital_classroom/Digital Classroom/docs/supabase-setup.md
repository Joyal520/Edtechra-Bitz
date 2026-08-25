# Digital Classroom Supabase Setup

The Digital Classroom module now supports the same Edtechra browser Supabase pattern, but it does not hardcode credentials.

## Standalone local setup

1. Open `assets/js/supabase-config.js` inside the Digital Classroom module.
2. Populate it locally with the same public project URL and anon key used by Edtechra.
3. Keep the exact key names `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

Example shape:

```js
window.EDTECHRA_DC_ENV = {
  SUPABASE_URL: "https://your-project.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-key"
};
```

## Notes

- Do not place a service role key in browser code.
- The active classroom UI falls back to localStorage when Supabase config, auth, or classroom tables are unavailable.
- When the module is embedded into the main Edtechra app later, the parent application can inject the same `window.EDTECHRA_DC_ENV` object before `assets/js/supabase-client.js` runs.
