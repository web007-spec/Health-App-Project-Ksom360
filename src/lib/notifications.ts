export const showBrowserNotification = async (
  title: string,
  options?: NotificationOptions
) => {
  if (!("Notification" in window)) {
    console.warn("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    new Notification(title, options);
    return true;
  } else if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      new Notification(title, options);
      return true;
    }
  }

  return false;
};

export const checkUpcomingWorkouts = (
  workouts: Array<{ scheduled_date: string; workout_plans: { name: string } }>,
  notificationPreference: { reminder_hours_before: number; push_enabled: boolean }
) => {
  if (!notificationPreference.push_enabled) return;

  const now = new Date();
  const reminderWindow = new Date(
    now.getTime() + notificationPreference.reminder_hours_before * 60 * 60 * 1000
  );

  workouts.forEach((workout) => {
    const workoutDate = new Date(workout.scheduled_date);
    
    // If workout is within the reminder window, show notification
    if (workoutDate <= reminderWindow && workoutDate > now) {
      const hoursUntil = Math.round(
        (workoutDate.getTime() - now.getTime()) / (1000 * 60 * 60)
      );
      
      showBrowserNotification("Upcoming Workout Reminder", {
        body: `${workout.workout_plans.name} is scheduled in ${hoursUntil} hours`,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: `workout-${workout.scheduled_date}`,
        requireInteraction: false,
      });
    }
  });
};
