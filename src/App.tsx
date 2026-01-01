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

interface ModeConfig {
  [key: string]: string[];
}

const DEFAULT_URLS: ModeConfig = {
  sleep: ["035d3iiFej4", "HAzZH6wccew", "XGSSmQiqBl8"], // Lullabies
  relax: ["Na0w3Mz46GA", "P6tFwmw2OEY", "n2-beumXxEM"], // Relaxing music
  play: ["REtbaAA4j7U", "BW4H15rK6iI", "CaqHOvgAnO0"], // Upbeat kids songs
  learning: ["XzorjCt7Cv8", "O8BThfcH-F4", "hRxJRkMXuZI"], // English learning songs
};

const YoutubePlayer = () => {
  const [currentMode, setCurrentMode] = useState<Mode>("sleep");
  const [modeUrls, setModeUrls] = useState<ModeConfig>(DEFAULT_URLS);
  const [videoId, setVideoId] = useState<string>(DEFAULT_URLS["sleep"][0]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [player, setPlayer] = useState<any>(null);

  // Load and Sanitize from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem("babyMusicApp_urls");
    let currentUrls = DEFAULT_URLS;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const sanitized: ModeConfig = {};
        (Object.keys(parsed) as Mode[]).forEach(mode => {
          sanitized[mode] = (parsed[mode] || []).map((url: string) => extractVideoId(url)).filter((id: string | null): id is string => id !== null);
        });
        currentUrls = sanitized;
        setModeUrls(sanitized);
      } catch (e) {
        console.error("Failed to parse saved URLs", e);
      }
    }

    // Set initial video
    if (currentUrls[currentMode] && currentUrls[currentMode].length > 0) {
      setVideoId(currentUrls[currentMode][0]);
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem("babyMusicApp_urls", JSON.stringify(modeUrls));
  }, [modeUrls]);

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
      const otherUrls = urls.filter(id => id !== videoId);
      const targetUrls = otherUrls.length > 0 ? otherUrls : urls;

      const randomIndex = Math.floor(Math.random() * targetUrls.length);
      const nextId = targetUrls[randomIndex];

      console.log("Next ID (Sanitized):", nextId);
      setVideoId(nextId);

      if (player) {
        player.loadVideoById(nextId);
        player.playVideo();
      }
    } else {
      alert("このモードには曲が設定されていません。設定から追加してください。");
    }
  }, [currentMode, modeUrls, player, videoId]);

  const addUrl = () => {
    const id = extractVideoId(newUrl);
    if (id) {
      setModeUrls(prev => ({
        ...prev,
        [currentMode]: [...prev[currentMode], id]
      }));
      setNewUrl("");
    } else {
      alert("無効なURLまたはIDです");
    }
  };

  const removeUrl = (index: number) => {
    setModeUrls(prev => ({
      ...prev,
      [currentMode]: prev[currentMode].filter((_, i) => i !== index)
    }));
  };

  const onPlayerReady: YouTubeProps["onReady"] = (event) => {
    setPlayer(event.target);
    console.log("Player ready");
  };

  const opts: YouTubeProps["opts"] = {
    height: "100%",
    width: "100%",
    playerVars: {
      autoplay: 1, // ユーザー操作（ボタンクリック）から呼ばれるため、1に設定
      modestbranding: 1,
      rel: 0,
      controls: 1,
      playsinline: 1, // iOS Safariでフルスクリーン表示を防ぐ
    },
  };

  const modeInfo = {
    sleep: { icon: Moon, label: "スリープ", color: "sleep" },
    relax: { icon: Wind, label: "リラックス", color: "relax" },
    play: { icon: Gamepad2, label: "お楽しみ", color: "play" },
    learning: { icon: BookOpen, label: "えいご", color: "learning" },
  };

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

        <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
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
                  style={{ marginBottom: 0 }}
                />
                <button className="btn-secondary" onClick={addUrl} style={{ padding: "0.75rem" }}>
                  <Plus size={20} />
                </button>
              </div>
            </div>

            <div>
              <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.5rem" }}>現在のURLリスト:</p>
              {modeUrls[currentMode].map((id, index) => (
                <div key={index} className="url-item">
                  <span style={{ fontSize: "0.8rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    {id}
                  </span>
                  <button className="delete-btn" onClick={() => removeUrl(index)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {modeUrls[currentMode].length === 0 && (
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