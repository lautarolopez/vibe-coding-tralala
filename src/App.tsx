import React from "react";
import Game from "./components/Game";

function App() {
  return (
    <div className="w-full h-screen">
      <Game />
      <div className="fixed bottom-4 left-4 bg-black/50 text-white p-4 rounded-lg">
        <h2 className="text-xl font-bold mb-2">Controls</h2>
        <p>Use WASD keys to move the character</p>
        <p>Click to attack</p>
      </div>
    </div>
  );
}

export default App;
