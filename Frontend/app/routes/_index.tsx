import type { MetaFunction } from "@remix-run/node";
import {useTheme} from "@heroui/use-theme";
import {useEffect} from "react";

export const meta: MetaFunction = () => {
  return [
    { title: "Echosphere" },
    { name: "description", content: "Your favorite movies and series from everywhere!" },
  ];
};


export default function Index() {

  return (
    <div className="relative flex flex-col h-screen">
      <div className="bg-background" >Echosphere</div>
    </div>
  );
}