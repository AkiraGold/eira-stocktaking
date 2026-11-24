import React from "react";
import CardItemName from "@/components/atoms/CardItemName";
import CardItemDescription from "@/components/atoms/CardItemDescription";
import CardItemNote from "@/components/atoms/CardItemNote";
import CardItemDate from "@/components/atoms/CardItemDate";
import StateBadge from "@/components/atoms/StateBadge";
import { useItemImage } from "@/hooks/useItemImage";
import { INVENTORY_STATES } from "@/utils/inventoryStates";

const stateBgColors = {
  [INVENTORY_STATES.NOT_FOUND]: "var(--st-no-bg)",
  [INVENTORY_STATES.FOUND]: "var(--st-ok-bg)",
  [INVENTORY_STATES.MOVED]: "var(--st-mv-bg)",
  [INVENTORY_STATES.NEW]: "var(--st-new-bg)",
  [INVENTORY_STATES.UNCHECKED]: "var(--st-un-bg)",
};

export default function StocktakingItemCard({
  item,
  renderActions,
  renderQuickActions,
  compact = false,
  imagesResolvedForCurrentPage = false,
  enableLazyImageFetch = false,
  showInventoryDetails = true,
  useStateColor = true
}) {
  // In base-RM contexts, we must ignore inventory state colorization completely.
  const bgColor = useStateColor && item.state && stateBgColors[item.state]
    ? stateBgColors[item.state]
    : stateBgColors[INVENTORY_STATES.UNCHECKED];
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  const imageRef = React.useRef(null);
  const { containerRef, imageSrc, isWaitingForLazyImage } = useItemImage({
    itemId: item?.id,
    itemImage: item?.image,
    compact,
    enableLazyImageFetch,
  });

  const imageResetKey = `${imageSrc ?? ""}::${item.id}`;
  const [prevImageResetKey, setPrevImageResetKey] = React.useState(imageResetKey);
  if (imageResetKey !== prevImageResetKey) {
    setPrevImageResetKey(imageResetKey);
    setImageLoaded(false);
    setImageError(false);
  }

  const showImage = !compact && imageSrc && !imageError;
  const showLoadingPlaceholder = !compact && isWaitingForLazyImage;
  const showNoImagePlaceholder = !compact && !isWaitingForLazyImage && (imageError || !imageSrc);

  React.useEffect(() => {
    if (!showImage) return;
    const img = imageRef.current;
    if (!img) return;
    // Safari may serve cached images without firing onLoad reliably.
    if (img.complete) {
      if (img.naturalWidth > 0) {
        setImageLoaded(true);
      } else {
        setImageError(true);
      }
    }
  }, [showImage, imageSrc]);

  return (
    <div
      ref={containerRef}
      className={compact ? "flex flex-col rounded-2xl overflow-hidden p-4" : "flex flex-col rounded-2xl overflow-hidden h-full"}
      style={{ background: bgColor }}
    >
      {showImage && (
        <div style={{ position: "relative", width: "100%", height: 100, flexShrink: 0 }}>
          {!imageLoaded && (
            <div
              className="image-placeholder-pulse"
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(90deg, var(--skeleton) 25%, var(--skeleton-hi) 50%, var(--skeleton) 75%)",
                backgroundSize: "200% 100%"
              }}
            />
          )}
          <img
            key={`${item.id}-${imageSrc}`}
            ref={imageRef}
            src={imageSrc}
            alt={item.name}
            loading="eager"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: imageLoaded ? "block" : "none"
            }}
          />
        </div>
      )}
      {showLoadingPlaceholder && (
        <div
          className="image-placeholder-pulse"
          style={{
            width: "100%",
            height: 100,
            background: "linear-gradient(90deg, var(--skeleton) 25%, var(--skeleton-hi) 50%, var(--skeleton) 75%)",
            backgroundSize: "200% 100%"
          }}
        />
      )}
      {showNoImagePlaceholder && (
        <div
          style={{
            width: "100%",
            height: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--skeleton)",
            color: "var(--muted)"
          }}
          aria-label="No image available"
        >
          <span className="material-icons-round" style={{ fontSize: 22 }}>image_not_supported</span>
        </div>
      )}
      <style jsx>{`
        .image-placeholder-pulse {
          animation: imagePlaceholderPulse 1.2s linear infinite;
        }
        @keyframes imagePlaceholderPulse {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div className={compact ? "flex flex-col gap-1" : "p-4 flex flex-col justify-between flex-grow"}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <CardItemName>{item.name}</CardItemName>
            {renderActions && renderActions(item)}
          </div>
          <CardItemDescription>{item.description}</CardItemDescription>
          {useStateColor && item.state ? (
            <div style={{ marginTop: 6 }}>
              <StateBadge state={item.state} />
            </div>
          ) : null}
          {showInventoryDetails ? (
            <CardItemNote showLabel={false}>{item.note}</CardItemNote>
          ) : null}
        </div>
        {showInventoryDetails ? (
          <CardItemDate>
            Poslední kontrola {item.lastCheck ? new Date(item.lastCheck).toLocaleString() : ""}
          </CardItemDate>
        ) : null}
        {renderQuickActions ? renderQuickActions(item) : null}
      </div>
    </div>
  );
} 