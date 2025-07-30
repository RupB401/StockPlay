import React, { createContext, useContext, useState, useEffect } from "react";

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [priceAlerts, setPriceAlerts] = useState([]);
  const [settings, setSettings] = useState({
    priceAlerts: true,
    newsUpdates: true,
    portfolioAlerts: true,
    marketEvents: true,
    tradeReminders: true,
    scheduledAlerts: true,
    sound: true,
    email: false,
  });

  // Load notifications from localStorage on mount
  useEffect(() => {
    const savedNotifications = localStorage.getItem("stockplay_notifications");
    const savedAlerts = localStorage.getItem("stockplay_price_alerts");
    const savedSettings = localStorage.getItem(
      "stockplay_notification_settings"
    );

    if (savedNotifications) {
      const parsed = JSON.parse(savedNotifications);
      setNotifications(parsed);
      setUnreadCount(parsed.filter((n) => !n.read).length);
    }

    if (savedAlerts) {
      setPriceAlerts(JSON.parse(savedAlerts));
    }

    if (savedSettings) {
      setSettings({ ...settings, ...JSON.parse(savedSettings) });
    }
  }, []);

  // Save to localStorage whenever notifications change
  useEffect(() => {
    localStorage.setItem(
      "stockplay_notifications",
      JSON.stringify(notifications)
    );
    setUnreadCount(notifications.filter((n) => !n.read).length);
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem("stockplay_price_alerts", JSON.stringify(priceAlerts));
  }, [priceAlerts]);

  useEffect(() => {
    localStorage.setItem(
      "stockplay_notification_settings",
      JSON.stringify(settings)
    );
  }, [settings]);

  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      read: false,
      ...notification,
    };

    setNotifications((prev) => [newNotification, ...prev]);

    // Play sound if enabled
    if (settings.sound) {
      playNotificationSound();
    }

    // Show browser notification if permission granted
    if (Notification.permission === "granted") {
      new Notification(`StockPlay - ${notification.title}`, {
        body: notification.message,
        icon: "/favicon.ico",
      });
    }
  };

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const deleteNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const addPriceAlert = (alert) => {
    const newAlert = {
      id: Date.now() + Math.random(),
      symbol: alert.symbol,
      name: alert.name,
      type: alert.type, // 'above', 'below'
      price: alert.price,
      currentPrice: alert.currentPrice,
      active: true,
      created: new Date(),
    };
    setPriceAlerts((prev) => [...prev, newAlert]);
  };

  const removePriceAlert = (id) => {
    setPriceAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const togglePriceAlert = (id) => {
    setPriceAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a))
    );
  };

  const checkPriceAlerts = (stockData) => {
    priceAlerts.forEach((alert) => {
      if (!alert.active) return;

      const stock = stockData.find((s) => s.symbol === alert.symbol);
      if (!stock) return;

      const currentPrice = parseFloat(stock.price.replace(/[$,]/g, ""));
      const alertPrice = parseFloat(alert.price);

      let triggered = false;
      if (alert.type === "above" && currentPrice >= alertPrice) {
        triggered = true;
      } else if (alert.type === "below" && currentPrice <= alertPrice) {
        triggered = true;
      }

      if (triggered) {
        addNotification({
          type: "price_alert",
          title: "Price Alert Triggered!",
          message: `${alert.symbol} is now ${
            alert.type
          } $${alertPrice} (Current: $${currentPrice.toFixed(2)})`,
          symbol: alert.symbol,
          priority: "high",
        });

        // Deactivate the alert after triggering
        togglePriceAlert(alert.id);
      }
    });
  };

  const playNotificationSound = () => {
    try {
      const audio = new Audio("/notification-sound.mp3");
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Fallback to system beep
        console.beep?.();
      });
    } catch (error) {
      console.log("Could not play notification sound");
    }
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }
    return Notification.permission === "granted";
  };

  const sendTestNotification = () => {
    addNotification({
      type: "test",
      title: "Test Notification",
      message: "This is a test notification to verify your settings.",
      priority: "normal",
    });
  };

  const value = {
    notifications,
    unreadCount,
    priceAlerts,
    settings,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    deleteNotification,
    addPriceAlert,
    removePriceAlert,
    togglePriceAlert,
    checkPriceAlerts,
    setSettings,
    requestNotificationPermission,
    sendTestNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
