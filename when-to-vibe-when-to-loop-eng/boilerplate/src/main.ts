import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root element #app was not found.");
}

app.innerHTML = `
  <main class="min-h-screen p-6">
    <h1 class="text-2xl font-bold">Singapore Temperature Explorer</h1>
    <p class="mt-2">Use the demo fixture to vibe-code your dashboard.</p>
  </main>
`;
