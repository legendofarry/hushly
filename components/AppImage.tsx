import React, { useState } from "react";

type Props = React.ImgHTMLAttributes<HTMLImageElement> & {
  fadeIn?: boolean;
};

const AppImage: React.FC<Props> = ({
  className,
  style,
  loading = "lazy",
  decoding = "async",
  fadeIn = true,
  onLoad,
  ...rest
}) => {
  const [loaded, setLoaded] = useState(false);

  const mergedClassName = [
    className,
    fadeIn ? "transition-opacity duration-300" : "",
    fadeIn && !loaded ? "opacity-0" : "opacity-100",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <img
      {...rest}
      loading={loading}
      decoding={decoding}
      className={mergedClassName}
      style={style}
      onLoad={(event) => {
        setLoaded(true);
        onLoad?.(event);
      }}
    />
  );
};

export default AppImage;
