/* Turns the public preview into the live site.

   Leave supabaseUrl and supabaseKey blank and the site is the preview: everything stays in the visitor's
   browser, with a switch to look around as an owner or a client. Fill them in from your Supabase project
   (Project Settings, API: the project URL and the publishable key, called "anon" on older projects) and
   the site switches to real accounts, shared jobs, photos, paperwork and payments. See SETUP.md.

   Both values are meant to be public. The database's row-level security, not secrecy, is what protects
   the data. Never put the secret or service-role key here. */
window.SGP_CONFIG = {
  supabaseUrl: '',
  supabaseKey: '',
  // Where the site lives. Links in emails, QR labels and the return from card checkout point here.
  siteUrl: 'https://manu3931.github.io/Agency/',
};
