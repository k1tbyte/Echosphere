import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: "Echosphere" },
    { name: "description", content: "Your favorite movies and series from everywhere!" },
  ];
};


export default function Index() {
  return (
    <div className="flex flex-col h-screen">
      Echosphere
    </div>
  );
}