# Student's Companion

A mobile-first student portfolio MVP for secondary school reflections, built with Next.js, Tailwind CSS, Firebase Auth, Firestore, and Vercel.

## What is included

- Landing page with Google sign-in
- Firebase Auth provider using Google login
- Protected student dashboard
- Add reflection form
- Optional image upload in reflections
- Student reflection timeline in its own tab
- Portfolio builder with reflection selection and PDF export
- Basic teacher dashboard for reflections students choose to share
- Firestore rules starter file

## Set up

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and add your Firebase web app values.

3. In Firebase Console, enable Google as an Auth provider.

4. Create a Firestore database and publish `firestore.rules`.
5. Create a Firebase Storage bucket and publish `storage.rules`.

6. Run locally:

   ```bash
   npm run dev
   ```

7. Deploy to Vercel and add the same environment variables in the Vercel project settings.

## Project structure

- `app/layout.tsx` wraps every page with shared metadata and auth state.
- `app/page.tsx` renders the landing page.
- `app/dashboard/page.tsx` renders the protected student dashboard.
- `app/timeline/page.tsx` renders the protected student timeline page.
- `app/teacher/page.tsx` renders the protected teacher dashboard.
- `app/globals.css` defines Tailwind layers and app-wide background styles.
- `components/auth-provider.tsx` listens to Firebase Auth and exposes login state.
- `components/sign-in-button.tsx` handles Google sign-in.
- `components/protected-route.tsx` keeps dashboards behind login.
- `components/app-shell.tsx` provides the logged-in navigation frame.
- `components/landing-page.tsx` contains the public first screen.
- `components/student-dashboard.tsx` composes the student reflection page.
- `components/portfolio-builder.tsx` builds a submission-ready portfolio and exports it with browser Print to PDF.
- `components/reflection-form.tsx` saves new reflections to Firestore.
- `components/reflection-form.tsx` saves reflections and uploads optional images to Firebase Storage.
- `components/reflection-timeline.tsx` subscribes to a student's own reflections.
- `components/teacher-dashboard.tsx` subscribes to shared reflections.
- `lib/firebase.ts` initializes Firebase Auth and Firestore.
- `lib/storage.ts` compresses and uploads reflection images.
- `lib/reflections.ts` contains Firestore create and realtime subscription helpers.
- `types/reflection.ts` defines reflection data types.
- `firestore.rules` provides starter privacy rules for student-owned reflections.
- `storage.rules` restricts image files to each student's own upload folder.
- `firebase.json` tells Firebase CLI where to find Firestore rules and indexes.
- `firestore.indexes.json` defines the compound indexes used by the timeline queries.
- `tailwind.config.ts`, `postcss.config.js`, `next.config.ts`, and `tsconfig.json` configure the app.

## Teacher access

For the MVP, teacher access in the interface is controlled by `NEXT_PUBLIC_TEACHER_EMAILS`, a comma-separated list of teacher emails.

Firestore security expects teacher accounts to have a Firebase custom claim:

```json
{ "teacher": true }
```

That keeps shared reflections visible only to the student who wrote them and authenticated teacher accounts. Private reflections remain visible only to their owner.
