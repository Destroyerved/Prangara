import { ShaderBackground } from "@/components/ui/waves-shader";
import { AppleStyleDock } from "@/components/ui/dock-demo";

export default function ShaderBackgroundDemo() {
  return (
    <div className="relative h-screen w-full overflow-hidden">
      <ShaderBackground className="h-full w-full" />
      <AppleStyleDock />
    </div>
  );
}
