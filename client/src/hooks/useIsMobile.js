import { useEffect, useState } from "react";

// True when the viewport is phone/tablet width. Drives the mobile
// sidebar + swipe shell vs the desktop top-nav layout.
export function useIsMobile(query = "(max-width: 760px)") {
    const [isMobile, setIsMobile] = useState(
        () =>
            typeof window !== "undefined" &&
            window.matchMedia(query).matches
    );

    useEffect(() => {
        const mq = window.matchMedia(query);
        const onChange = () => setIsMobile(mq.matches);
        mq.addEventListener("change", onChange);
        return () => mq.removeEventListener("change", onChange);
    }, [query]);

    return isMobile;
}
