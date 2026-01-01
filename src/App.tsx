import React, { useState, useEffect, useCallback } from "react";
import YouTube from "react-youtube";
import type { YouTubeProps } from "react-youtube";
import {
  Moon,
  Wind,
  Gamepad2,
  BookOpen,
  Settings,
  Play,
  Plus,
  Trash2,
  X,
  Music
} from "lucide-react";

type Mode = "sleep" | "relax" | "play" | "learning";

interface UrlItem {
  id: number;
  video_id: string;
}

interface ModeUrls {
  [key: string]: UrlItem[];
}

// Dynamically determine API base URL
// When accessing from iPhone, window.location.hostname will be the PC's IP (e.g., 192.168.40.94)
// When accessing from PC, it will be localhost
const API_BASE = `http://${window.location.hostname}:3001/api`;

const YoutubePlayer = () => {
  const [currentMode, setCurrentMode] = useState<Mode>("sleep");
  const [modeUrls, setModeUrls] = useState<ModeUrls>({});
  const [videoId, setVideoId] = useState<string>("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSelectionOpen, setIsSelectionOpen] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [player, setPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Load URLs from backend
  const fetchUrls = async (mode: Mode) => {
    try {
      const response = await fetch(`${API_BASE}/urls/${mode}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching URLs:', error);
      return [];
    }
  };

  // Load all modes on mount
  useEffect(() => {
    const loadAllUrls = async () => {
      setLoading(true);
      const modes: Mode[] = ['sleep', 'relax', 'play', 'learning'];
      const allUrls: ModeUrls = {};

      for (const mode of modes) {
        allUrls[mode] = await fetchUrls(mode);
      }

      setModeUrls(allUrls);

      // Set initial video
      if (allUrls[currentMode] && allUrls[currentMode].length > 0) {
        setVideoId(allUrls[currentMode][0].video_id);
      }

      setLoading(false);
    };

    loadAllUrls();
  }, []);

  // Reload URLs when mode changes
  useEffect(() => {
    const reloadCurrentMode = async () => {
      const urls = await fetchUrls(currentMode);
      setModeUrls(prev => ({
        ...prev,
        [currentMode]: urls
      }));
    };

    if (Object.keys(modeUrls).length > 0) {
      reloadCurrentMode();
    }
  }, [currentMode]);

  const extractVideoId = (url: string) => {
    if (!url) return null;
    if (url.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(url)) return url;

    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]{11}).*/;
    const match = url.match(regExp);
    return (match && match[7]) ? match[7] : null;
  };

  const handlePlayRandom = useCallback(() => {
    const urls = modeUrls[currentMode];
    if (urls && urls.length > 0) {
      const currentVideoIds = urls.map(u => u.video_id);
      const otherUrls = currentVideoIds.filter(id => id !== videoId);
      const targetUrls = otherUrls.length > 0 ? otherUrls : currentVideoIds;

      const randomIndex = Math.floor(Math.random() * targetUrls.length);
      const nextId = targetUrls[randomIndex];

      console.log("Next ID (Random):", nextId);
      setVideoId(nextId);

      if (player) {
        player.loadVideoById(nextId);
        player.playVideo();
      }
    } else {
      alert("このモードには曲が設定されていません。設定から追加してください。");
    }
  }, [currentMode, modeUrls, player, videoId]);

  const handlePlaySpecific = useCallback((videoId: string) => {
    console.log("Playing specific video:", videoId);
    setVideoId(videoId);

    if (player) {
      player.loadVideoById(videoId);
      player.playVideo();
    }

    setIsSelectionOpen(false);
  }, [player]);

  const addUrl = async () => {
    const id = extractVideoId(newUrl);
    if (id) {
      try {
        const response = await fetch(`${API_BASE}/urls/${currentMode}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId: id })
        });

        const newItem = await response.json();

        setModeUrls(prev => ({
          ...prev,
          [currentMode]: [...(prev[currentMode] || []), { id: newItem.id, video_id: id }]
        }));
        setNewUrl("");
      } catch (error) {
        console.error('Error adding URL:', error);
        alert("URLの追加に失敗しました");
      }
    } else {
      alert("無効なURLまたはIDです");
    }
  };

  const removeUrl = async (dbId: number, index: number) => {
    try {
      await fetch(`${API_BASE}/urls/${currentMode}/${dbId}`, {
        method: 'DELETE'
      });

      setModeUrls(prev => ({
        ...prev,
        [currentMode]: prev[currentMode].filter((_, i) => i !== index)
      }));
    } catch (error) {
      console.error('Error removing URL:', error);
      alert("URLの削除に失敗しました");
    }
  };

  const onPlayerReady: YouTubeProps["onReady"] = (event) => {
    setPlayer(event.target);
    console.log("Player ready");
  };

  const opts: YouTubeProps["opts"] = {
    height: "100%",
    width: "100%",
    playerVars: {
      autoplay: 1,
      modestbranding: 1,
      rel: 0,
      controls: 1,
      playsinline: 1,
    },
  };

  const modeInfo = {
    sleep: { icon: Moon, label: "スリープ", color: "sleep" },
    relax: { icon: Wind, label: "リラックス", color: "relax" },
    play: { icon: Gamepad2, label: "お楽しみ", color: "play" },
    learning: { icon: BookOpen, label: "えいご", color: "learning" },
  };

  if (loading) {
    return (
      <div className="container animate-fade-in">
        <div className="glass card" style={{ textAlign: "center", padding: "3rem" }}>
          <Music size={48} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in">
      <div className="glass card">
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <h1 className="title-gradient" style={{ fontSize: "2rem", marginBottom: "0.25rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
            <Music size={32} color="#8b5cf6" /> Baby Music
          </h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem" }}>Select a mode and press play</p>
        </div>

        <div className="mode-grid">
          {(Object.keys(modeInfo) as Mode[]).map((mode) => {
            const Info = modeInfo[mode];
            return (
              <button
                key={mode}
                className={`mode-btn ${currentMode === mode ? `active ${Info.color}` : ""}`}
                onClick={() => setCurrentMode(mode)}
              >
                <Info.icon size={32} />
                <span>{Info.label}</span>
              </button>
            );
          })}
        </div>

        <button className="btn-primary" onClick={handlePlayRandom}>
          <Play size={24} fill="currentColor" style={{ verticalAlign: "middle", marginRight: "8px" }} />
          ランダム再生開始
        </button>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginBottom: "1.5rem" }}>
          <button className="btn-secondary" onClick={() => setIsSelectionOpen(true)}>
            <Play size={18} />
            選択再生
          </button>
          <button className="btn-secondary" onClick={() => setIsSettingsOpen(true)}>
            <Settings size={18} />
            設定を編集
          </button>
        </div>

        <div style={{
          position: "relative",
          paddingBottom: "56.25%",
          height: 0,
          overflow: "hidden",
          borderRadius: "1rem",
          background: "#000",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        }}>
          {videoId && (
            <YouTube
              videoId={videoId}
              opts={opts}
              onReady={onPlayerReady}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
              }}
            />
          )}
          {!videoId && (
            <div style={{
              position: "absolute",
              top: 0, left: 0, width: "100%", height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "rgba(255,255,255,0.2)"
            }}>
              <Music size={48} />
            </div>
          )}
        </div>
      </div>

      {isSelectionOpen && (
        <div className="modal-overlay" onClick={() => setIsSelectionOpen(false)}>
          <div className="modal-content glass" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <Play size={20} />
                {modeInfo[currentMode].label} - 選択再生
              </h2>
              <button onClick={() => setIsSelectionOpen(false)} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}>
                <X size={24} />
              </button>
            </div>

            <div>
              <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.5rem" }}>再生する曲を選択:</p>
              {modeUrls[currentMode]?.map((item) => (
                <div key={item.id} className="url-item" style={{ cursor: "pointer" }} onClick={() => handlePlaySpecific(item.video_id)}>
                  <span style={{ fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    {item.video_id}
                  </span>
                  <Play size={18} color="#10b981" />
                </div>
              ))}
              {(!modeUrls[currentMode] || modeUrls[currentMode].length === 0) && (
                <p style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", padding: "1rem" }}>URLが設定されていません</p>
              )}
            </div>
          </div>
        </div>
      )}

      {isSettingsOpen && (
        <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="modal-content glass" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <Settings size={20} />
                {modeInfo[currentMode].label} の設定
              </h2>
              <button onClick={() => setIsSettingsOpen(false)} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.5rem" }}>新しいURLを追加:</p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="YouTube URL or ID"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addUrl()}
                  style={{ marginBottom: 0 }}
                />
                <button className="btn-secondary" onClick={addUrl} style={{ padding: "0.75rem" }}>
                  <Plus size={20} />
                </button>
              </div>
            </div>

            <div>
              <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.5rem" }}>現在のURLリスト ({modeUrls[currentMode]?.length || 0}件):</p>
              {modeUrls[currentMode]?.map((item, index) => (
                <div key={item.id} className="url-item">
                  <span style={{ fontSize: "0.8rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    {item.video_id}
                  </span>
                  <button className="delete-btn" onClick={() => removeUrl(item.id, index)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {(!modeUrls[currentMode] || modeUrls[currentMode].length === 0) && (
                <p style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", padding: "1rem" }}>URLが設定されていません</p>
              )}
            </div>

            <button className="btn-primary" onClick={() => setIsSettingsOpen(false)} style={{ marginTop: "1.5rem", marginBottom: 0 }}>
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default YoutubePlayer;