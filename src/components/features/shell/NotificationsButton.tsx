"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { IconButton } from "@/components/ui/IconButton";
import { NOTIFICATION_TEXT } from "@/constants/notifications";

import { NotificationsPanel } from "./NotificationsPanel";
import { useNotifications } from "./useNotifications";

/**
 * The bell: how many notifications are unread, and the list of them (spec 80). On phones the list
 * spans the top bar, with the page gutter each side; wider, it hangs under the bell.
 */
export function NotificationsButton() {
  const notifications = useNotifications();
  const { unreadCount, reload } = notifications;
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    function handlePointerDown(event: MouseEvent): void {
      if (!(event.target instanceof Node) || !rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== "Escape" || !isOpen) return;
    setIsOpen(false);
    rootRef.current?.querySelector("button")?.focus();
  }

  function toggle(): void {
    if (!isOpen) reload();
    setIsOpen((open) => !open);
  }

  return (
    <div ref={rootRef} onKeyDown={handleKeyDown} className="phone:relative">
      <IconButton
        icon="bell"
        label={NOTIFICATION_TEXT.bellLabel(unreadCount)}
        isExpanded={isOpen}
        onClick={toggle}
        badge={
          unreadCount > 0 && (
            <span
              aria-hidden="true"
              className="bg-bad text-on-status text-small ring-canvas absolute top-1 right-0.5 h-5 min-w-5 rounded-full px-1.5 leading-5 font-semibold ring-2"
            >
              {NOTIFICATION_TEXT.badge(unreadCount)}
            </span>
          )
        }
      />
      {isOpen && (
        <NotificationsPanel
          notifications={notifications}
          onClose={() => {
            setIsOpen(false);
          }}
        />
      )}
    </div>
  );
}
