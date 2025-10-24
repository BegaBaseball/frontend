import { useState } from "react";
import { setDevUser, getDevUser } from "../utils/devAuth";
import { Button } from "./ui/button";

const teams = ["LG", "DO", "SS", "KT", "WO", "NC", "SK", "HH", "LT", "HT"];

export default function DevAuthPanel() {
  const currentUser = getDevUser();
  const [email, setEmail] = useState(currentUser?.email ?? "test@bega.app");
  const [name, setName] = useState(currentUser?.name ?? "테스트");
  const [team, setTeam] = useState(currentUser?.team ?? "LG");

  const handleLogin = () => {
    setDevUser({ email, name, team });
    window.location.reload(); // 간단한 새로고침으로 상태 업데이트
  };

  const handleLogout = () => {
    localStorage.removeItem("devUser");
    window.location.reload();
  };

  return (
    <div className="mb-4 p-4 border border-gray-300 rounded-lg bg-yellow-50">
      
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <label className="text-xs font-medium">이메일</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            placeholder="email"
          />
        </div>
        <div>
          <label className="text-xs font-medium">이름</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            placeholder="name"
          />
        </div>
        <div>
          <label className="text-xs font-medium">팀</label>
          <select
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          >
            {teams.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button
          onClick={handleLogin}
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          Dev 로그인
        </Button>
        {currentUser && (
          <Button onClick={handleLogout} size="sm" className="bg-red-500 hover:bg-red-600 text-white">
            로그아웃
          </Button>
        )}
      </div>
      
      {currentUser && (
        <div className="text-xs text-gray-600 bg-white p-2 rounded mt-2">
          ✅ 현재: {currentUser.name} ({currentUser.team}팀) - {currentUser.email}
        </div>
      )}
    </div>
  );
}
