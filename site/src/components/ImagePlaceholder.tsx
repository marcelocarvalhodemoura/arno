import React from "react";
import "./ImagePlaceholder.css";

interface ImagePlaceholderProps {
  width?: string;
  height?: string;
  text?: string;
  className?: string;
}

const ImagePlaceholder: React.FC<ImagePlaceholderProps> = ({
  width = "100%",
  height = "200px",
  text = "Image Placeholder",
  className = "",
}) => {
  return (
    <div className={`image-placeholder ${className}`} style={{ width, height }}>
      <div className="placeholder-content">
        <span>{text}</span>
      </div>
    </div>
  );
};

export default ImagePlaceholder;
