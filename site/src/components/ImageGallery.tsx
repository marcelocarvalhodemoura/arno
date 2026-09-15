import React, { useState } from "react";
import ImagePlaceholder from "./ImagePlaceholder";
import "./ImageGallery.css";

interface ImageGalleryProps {
  images: { id: number; title: string; description: string }[];
  title?: string;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  title = "Galeria de Imagens",
}) => {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  const openModal = (id: number) => {
    setSelectedImage(id);
  };

  const closeModal = () => {
    setSelectedImage(null);
  };

  return (
    <div className="image-gallery">
      <h3>{title}</h3>
      <div className="gallery-grid">
        {images.map((image) => (
          <div
            key={image.id}
            className="gallery-item"
            onClick={() => openModal(image.id)}
          >
            <ImagePlaceholder width="100%" height="150px" text={image.title} />
            <div className="gallery-item-info">
              <h4>{image.title}</h4>
              <p>{image.description}</p>
            </div>
          </div>
        ))}
      </div>

      {selectedImage && (
        <div className="modal" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <span className="close" onClick={closeModal}>
              &times;
            </span>
            <ImagePlaceholder
              width="100%"
              height="400px"
              text={
                images.find((img) => img.id === selectedImage)?.title ||
                "Imagem"
              }
            />
            <div className="modal-info">
              <h4>{images.find((img) => img.id === selectedImage)?.title}</h4>
              <p>
                {images.find((img) => img.id === selectedImage)?.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGallery;
