import { useEffect, useState } from "react";
import { subscribeSocialCount, refreshSocialCount } from "../services/social";

/**
 * Hook to retrieve and subscribe to actionable pending social notifications:
 * - pending incoming friend requests
 * - pending incoming challenge invitations
 */
export function useSocialNotifications(enabled = true) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!enabled) {
            setCount(0);
            return;
        }

        const unsubscribe = subscribeSocialCount(setCount);
        refreshSocialCount();
        return unsubscribe;
    }, [enabled]);

    return count;
}
