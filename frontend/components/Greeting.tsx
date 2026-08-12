"use client";

import { useEffect, useState } from "react";

function greetingFor(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function Greeting() {
  // Computed client-side so the greeting matches the viewer's local time,
  // not the server's.
  const [text, setText] = useState("Welcome back");

  useEffect(() => {
    // Deliberately post-mount: the server doesn't know the visitor's local
    // hour, so computing this during render would mismatch on hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(greetingFor(new Date().getHours()));
  }, []);

  return <>{text}</>;
}
