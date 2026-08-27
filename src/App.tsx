// Build shim: the real application lives in the `frontend/` folder
// (React + pure CSS + Supabase). This file only re-exports it so the
// preview build keeps working from the repository root.
export { default } from "../frontend/src/App";
