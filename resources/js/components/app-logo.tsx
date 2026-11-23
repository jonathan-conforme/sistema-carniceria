import { Beef } from 'lucide-react';

export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-[#E2424A] text-white shadow-xs">
                <Beef className="size-5" />
            </div>
            <div className="ml-1.5 grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold text-[#FEE9D6]">Carnicería</span>
                <span className="truncate text-[11px] font-medium text-[#F9BF8F]/80">Sistema POS</span>
            </div>
        </>
    );
}
