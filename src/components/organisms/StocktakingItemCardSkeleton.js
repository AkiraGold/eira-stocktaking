import React from "react";

export default function StocktakingItemCardSkeleton({ compact = false }) {
  return (
    <div
      className={compact ? "flex flex-col rounded-2xl overflow-hidden p-4" : "flex flex-col rounded-2xl overflow-hidden h-full"}
      style={{ background: "var(--surface-2)" }}
    >
      {!compact && (
        <div 
          style={{ 
            width: "100%", 
            height: 100, 
            background: "linear-gradient(90deg, var(--skeleton) 25%, var(--line) 50%, var(--skeleton) 75%)",
            backgroundSize: "200% 100%",
            animation: "loading 1.5s infinite"
          }} 
        />
      )}
      <div className={compact ? "flex flex-col gap-1" : "p-4 flex flex-col justify-between flex-grow"}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div 
              style={{ 
                height: 20, 
                width: "60%", 
                background: "linear-gradient(90deg, var(--skeleton) 25%, var(--line) 50%, var(--skeleton) 75%)",
                backgroundSize: "200% 100%",
                animation: "loading 1.5s infinite",
                borderRadius: 4
              }} 
            />
            <div 
              style={{ 
                height: 20, 
                width: 24, 
                background: "linear-gradient(90deg, var(--skeleton) 25%, var(--line) 50%, var(--skeleton) 75%)",
                backgroundSize: "200% 100%",
                animation: "loading 1.5s infinite",
                borderRadius: 4
              }} 
            />
          </div>
          <div 
            style={{ 
              height: 16, 
              width: "80%", 
              marginTop: 8,
              background: "linear-gradient(90deg, var(--skeleton) 25%, var(--line) 50%, var(--skeleton) 75%)",
              backgroundSize: "200% 100%",
              animation: "loading 1.5s infinite",
              borderRadius: 4
            }} 
          />
          <div 
            style={{ 
              height: 14, 
              width: "70%", 
              marginTop: 4,
              background: "linear-gradient(90deg, var(--skeleton) 25%, var(--line) 50%, var(--skeleton) 75%)",
              backgroundSize: "200% 100%",
              animation: "loading 1.5s infinite",
              borderRadius: 4
            }} 
          />
        </div>
        <div 
          style={{ 
            height: 14, 
            width: "50%", 
            marginTop: 8,
            background: "linear-gradient(90deg, var(--skeleton) 25%, var(--line) 50%, var(--skeleton) 75%)",
            backgroundSize: "200% 100%",
            animation: "loading 1.5s infinite",
            borderRadius: 4
          }} 
        />
      </div>
    </div>
  );
} 