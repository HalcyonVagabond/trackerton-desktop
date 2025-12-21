interface LoadingOverlayProps {
  visible: boolean;
  logoSrc: string;
}

export function LoadingOverlay({ visible, logoSrc }: LoadingOverlayProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="loading-screen">
      <div className="loading-content">
        <img src={logoSrc} alt="Loading" className="loading-logo" />
        <p className="loading-text">Loading your workspace…</p>
      </div>
    </div>
  );
}
