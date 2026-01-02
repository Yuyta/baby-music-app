import React, { useState, useEffect, useCallback, useRef } from "react";
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

const marqueeStyle = `
  @keyframes marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
`;

// --- マーキーテキストコンポーネント ---
const MarqueeText = ({ text, fontSize }: { text: string, fontSize: string }) => {
  const [isOverflowing, setIsOverflowing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && measureRef.current) {
        // 判定に2pxのバッファを持たせ、確実に溢れている時だけアニメーションさせる
        setIsOverflowing(measureRef.current.offsetWidth > containerRef.current.offsetWidth + 2);
      }
    };

    const timer = setTimeout(checkOverflow, 150);
    window.addEventListener('resize', checkOverflow);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkOverflow);
    };
  }, [text]);

  const textStyle: React.CSSProperties = {
    fontSize: fontSize,
    fontWeight: "500",
    whiteSpace: "nowrap",
  };

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        overflow: "hidden",
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        height: "1.4em",
        // 溢れている時のみフェードマスクをかける
        maskImage: isOverflowing ? "linear-gradient(to right, transparent, black 3%, black 97%, transparent)" : "none",
        WebkitMaskImage: isOverflowing ? "linear-gradient(to right, transparent, black 3%, black 97%, transparent)" : "none",
      }}
    >
      {/* 測定用要素 */}
      <span ref={measureRef} style={{ ...textStyle, position: 'absolute', visibility: 'hidden' }}>
        {text}
      </span>

      {isOverflowing ? (
        /* 文字が溢れる場合のみ流れる */
        <div style={{ ...textStyle, display: "inline-block", animation: "marquee 45s linear infinite" }}>
          <span>{text}</span>
          <span style={{ paddingLeft: "100px" }}>{text}</span>
        </div>
      ) : (
        /* 収まる場合は静止 */
        <span style={{ ...textStyle, overflow: "hidden", textOverflow: "ellipsis" }}>
          {text}
        </span>
      )}
    </div>
  );
};

type Mode = "sleep" | "relax" | "play" | "learning";

interface UrlItem {
  id: number;
  video_id: string;
}

interface ModeUrls {
  [key: string]: UrlItem[];
}

const API_BASE = `http://${window.location.hostname}:3001/api`;

const YoutubePlayer = () => {
  const [currentMode, setCurrentMode] = useState<Mode>("sleep");
  const [modeUrls, setModeUrls] = useState<ModeUrls>({});
  const [videoTitles, setVideoTitles] = useState<{ [key: string]: string }>({});
  const [videoId, setVideoId] = useState<string>("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSelectionOpen, setIsSelectionOpen] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [player, setPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchVideoTitle = async (vId: string) => {
    if (videoTitles[vId]) return;
    try {
      const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vId}&format=json`);
      const data = await response.json();
      setVideoTitles(prev => ({ ...prev, [vId]: data.title }));
    } catch (error) {
      setVideoTitles(prev => ({ ...prev, [vId]: vId }));
    }
  };

  const fetchUrls = async (mode: Mode) => {
    try {
      const response = await fetch(`${API_BASE}/urls/${mode}`);
      const data = await response.json();
      return data;
    } catch (error) {
      return [];
    }
  };

  useEffect(() => {
    const loadAllUrls = async () => {
      setLoading(true);
      const modes: Mode[] = ['sleep', 'relax', 'play', 'learning'];
      const allUrls: ModeUrls = {};
      for (const mode of modes) {
        allUrls[mode] = await fetchUrls(mode);
      }
      setModeUrls(allUrls);
      if (allUrls[currentMode] && allUrls[currentMode].length > 0) {
        setVideoId(allUrls[currentMode][0].video_id);
      }
      setLoading(false);
    };
    loadAllUrls();
  }, []);

  useEffect(() => {
    const allVideoIds = Object.values(modeUrls).flat().map(item => item.video_id);
    const uniqueIds = Array.from(new Set(allVideoIds));
    uniqueIds.forEach(id => {
      if (!videoTitles[id]) fetchVideoTitle(id);
    });
  }, [modeUrls]);

  useEffect(() => {
    const reloadCurrentMode = async () => {
      const urls = await fetchUrls(currentMode);
      setModeUrls(prev => ({ ...prev, [currentMode]: urls }));
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
      setVideoId(nextId);
      if (player) {
        player.loadVideoById(nextId);
        player.playVideo();
      }
    }
  }, [currentMode, modeUrls, player, videoId]);

  const handlePlaySpecific = useCallback((videoId: string) => {
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
        fetchVideoTitle(id);
      } catch (error) {
        alert("追加に失敗しました");
      }
    }
  };

  const removeUrl = async (dbId: number, index: number) => {
    try {
      await fetch(`${API_BASE}/urls/${currentMode}/${dbId}`, { method: 'DELETE' });
      setModeUrls(prev => ({
        ...prev,
        [currentMode]: prev[currentMode].filter((_, i) => i !== index)
      }));
    } catch (error) {
      alert("削除に失敗しました");
    }
  };

  const onPlayerReady: YouTubeProps["onReady"] = (event) => {
    setPlayer(event.target);
  };

  const opts: YouTubeProps["opts"] = {
    height: "100%", width: "100%",
    playerVars: { autoplay: 1, modestbranding: 1, rel: 0, controls: 1, playsinline: 1 },
  };

  const modeInfo = {
    sleep: { icon: Moon, label: "スリープ", color: "sleep" },
    relax: { icon: Wind, label: "リラックス", color: "relax" },
    play: { icon: Gamepad2, label: "お楽しみ", color: "play" },
    learning: { icon: BookOpen, label: "えいご", color: "learning" },
  };

  if (loading) return null;

  return (
    <div className="container animate-fade-in">
      <style>{marqueeStyle}</style>
      <div className="glass card">
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <h1 className="title-gradient" style={{ fontSize: "2.2rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
            <Music size={36} color="#8b5cf6" /> Baby Music
          </h1>
          {videoId && videoTitles[videoId] && (
            <p style={{ color: "#a78bfa", fontSize: "0.95rem", marginTop: "8px", fontWeight: "bold", padding: "0 15px" }}>
              ♪ {videoTitles[videoId]}
            </p>
          )}
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
                <Info.icon size={36} />
                <span style={{ fontSize: "1.1rem" }}>{Info.label}</span>
              </button>
            );
          })}
        </div>

        <button className="btn-primary" onClick={handlePlayRandom} style={{ fontSize: "1.3rem", padding: "1.2rem" }}>
          <Play size={28} fill="currentColor" style={{ verticalAlign: "middle", marginRight: "10px" }} />
          ランダム再生開始
        </button>

        <div style={{ display: "flex", gap: "1.2rem", justifyContent: "center", marginBottom: "1.5rem" }}>
          <button className="btn-secondary" onClick={() => setIsSelectionOpen(true)} style={{ fontSize: "1.1rem", padding: "1.1rem 1.5rem", flex: 1 }}>
            <Play size={22} /> 選択再生
          </button>
          <button className="btn-secondary" onClick={() => setIsSettingsOpen(true)} style={{ fontSize: "1.1rem", padding: "1.1rem 1.5rem", flex: 1 }}>
            <Settings size={22} /> リストを編集
          </button>
        </div>

        <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden", borderRadius: "1rem", background: "#000" }}>
          {videoId && (
            <YouTube videoId={videoId} opts={opts} onReady={onPlayerReady} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />
          )}
        </div>
      </div>

      {/* --- 選択再生モーダル --- */}
      {isSelectionOpen && (
        <div className="modal-overlay" onClick={() => setIsSelectionOpen(false)}>
          <div className="modal-content glass" onClick={(e) => e.stopPropagation()} style={{ width: "95%", maxWidth: "500px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.5rem", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
                <Play size={24} /> {modeInfo[currentMode].label}
              </h2>
              <button onClick={() => setIsSelectionOpen(false)} style={{ background: "none", border: "none", color: "white" }}><X size={28} /></button>
            </div>
            <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
              {modeUrls[currentMode]?.map((item) => (
                <div key={item.id} className="url-item" style={{ cursor: "pointer", padding: "1rem" }} onClick={() => handlePlaySpecific(item.video_id)}>
                  {/* 文字サイズを 1rem に調整 */}
                  <MarqueeText text={videoTitles[item.video_id] || "読み込み中..."} fontSize="1rem" />
                  <Play size={22} color="#10b981" style={{ flexShrink: 0, marginLeft: "12px" }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- 設定編集モーダル --- */}
      {isSettingsOpen && (
        <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="modal-content glass" onClick={(e) => e.stopPropagation()} style={{ width: "95%", maxWidth: "500px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.5rem", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
                <Settings size={24} /> 設定
              </h2>
              <button onClick={() => setIsSettingsOpen(false)} style={{ background: "none", border: "none", color: "white" }}><X size={28} /></button>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="YouTube URL or ID"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addUrl()}
                  style={{ marginBottom: 0, fontSize: "1rem", padding: "0.8rem" }}
                />
                <button className="btn-secondary" onClick={addUrl} style={{ padding: "0.8rem" }}><Plus size={24} /></button>
              </div>
            </div>

            <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
              {modeUrls[currentMode]?.map((item, index) => (
                <div key={item.id} className="url-item" style={{ padding: "0.8rem 1rem" }}>
                  {/* 文字サイズを 0.85rem に調整 */}
                  <MarqueeText text={videoTitles[item.video_id] || item.video_id} fontSize="0.85rem" />
                  <button className="delete-btn" onClick={() => removeUrl(item.id, index)} style={{ flexShrink: 0, marginLeft: "12px" }}>
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
            <button className="btn-primary" onClick={() => setIsSettingsOpen(false)} style={{ marginTop: "1.5rem", fontSize: "1.2rem" }}>閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default YoutubePlayer;