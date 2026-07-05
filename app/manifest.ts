import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "金山商店 管理画面",
    short_name: "金山管理",
    description: "有限会社金山商店 買取価格・管理システム",
    start_url: "/admin",
    display: "standalone",
    background_color: "#faf7f2",
    theme_color: "#24455c",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
