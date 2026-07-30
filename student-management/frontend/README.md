# Student Management, frontend

React SPA for the student list: paginate, search, add, edit, delete. UI half of the project, talks to the [backend](../backend) over REST.

Create React App with `react-scripts` 5, nothing custom in the build config. React 19, react-bootstrap, axios, sweetalert2 for dialogs, react-icons.

## Run

```bash
npm install
npm start      # :3000
npm run build
```

Start the backend first or the table renders "No members found." The base URL is hardwired to `http://localhost:5001/api` in `src/services/api.js`.

## One screen

A Bootstrap table with server-side pagination, a page-size selector (3, 5, 10, 25, 50, 100), a search box, and a modal for add and edit. Delete goes through a SweetAlert2 confirm.

Note that **search is broken server-side** and returns a 500. See the [root README](../README.md).

## Worth knowing

- **The modal is one component for both modes.** `studentId` being set is what flips it to edit and triggers the pre-fill fetch.
- **Search and page-size changes both reset to page 1**, so you can't get stranded on an out-of-range page.
- `fetchStudents` is wrapped in `useCallback` keyed on `page`, `limit`, and `search`, and the effect re-runs when those change. That's the single fetch trigger.
- `renderPagination` shows up to 5 numbered pages centered on the current one and clamps the window at both ends.
- `api.js` exports `getSubjects` and `createMark`, but nothing uses them. Leftovers from the broader schema.

## Scope

Single view, no routing, no auth, no state library. Form validation is Bootstrap's native `required`. The HTML title is still the default "React App".
