import { Menu, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/edupulse-logo.png";

interface AppHeaderProps {
  title: string;
  onMenuClick?: () => void;
  showMenu?: boolean;
}

const AppHeader = ({ title, onMenuClick, showMenu = false }: AppHeaderProps) => {
  return (
    <header className="bg-card border-b border-border sticky top-0 z-40">
      <div className="flex items-center justify-between h-16 px-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          {showMenu && (
            <Button variant="ghost" size="icon" onClick={onMenuClick}>
              <Menu className="h-5 w-5" />
            </Button>
          )}
          {!showMenu && (
            <img src={logo} alt="EduPulse" className="h-8 w-8" />
          )}
          <h1 className="text-xl font-bold text-secondary">{title}</h1>
        </div>
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};

export default AppHeader;
