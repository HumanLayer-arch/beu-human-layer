'use strict';

/* ================================================================
   HABIT / STREAK - Be U
   Tracks consecutive days of use.
   A "day" = at least one reflection completed.
   ================================================================ */

var Habit = (function() {

  var KEYS = {
    STREAK:       'beu_streak_count',
    LAST_ACTIVE:  'beu_streak_last_date'
  };

  /* Returns today's date as YYYY-MM-DD string */
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  /* Returns yesterday's date as YYYY-MM-DD string */
  function yesterdayStr() {
    var d = new Date();
    d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  /* Get current streak count */
  function getStreak() {
    return parseInt(localStorage.getItem(KEYS.STREAK) || '0', 10);
  }

  /* Get last active date */
  function getLastDate() {
    return localStorage.getItem(KEYS.LAST_ACTIVE) || '';
  }

  /**
   * Record a reflection for today.
   * Returns the new streak count.
   */
  function recordReflection() {
    var today     = todayStr();
    var yesterday = yesterdayStr();
    var lastDate  = getLastDate();
    var streak    = getStreak();

    if (lastDate === today) {
      // Already recorded today, no change
      return streak;
    } else if (lastDate === yesterday) {
      // Consecutive day -- increment
      streak++;
    } else {
      // Gap -- reset to 1
      streak = 1;
    }

    localStorage.setItem(KEYS.STREAK, String(streak));
    localStorage.setItem(KEYS.LAST_ACTIVE, today);
    return streak;
  }

  /**
   * Check if streak was lost (last activity was before yesterday).
   * Useful to show a gentle nudge if streak broke.
   */
  function isStreakActive() {
    var lastDate  = getLastDate();
    var yesterday = yesterdayStr();
    var today     = todayStr();
    return lastDate === today || lastDate === yesterday;
  }

  /**
   * Get a motivational message based on streak count.
   */
  function getStreakMessage(streak) {
    if (streak >= 30) return streak + ' dias reflexionando. Esto ya es un habito.';
    if (streak >= 14) return streak + ' dias seguidos. La consistencia es tu mayor herramienta.';
    if (streak >= 7)  return streak + ' dias. Una semana completa de reflexion.';
    if (streak >= 3)  return streak + ' dias consecutivos. Lo estas haciendo.';
    if (streak >= 2)  return 'Segundo dia consecutivo. El habito esta empezando.';
    return null; // No message for day 1
  }

  return {
    recordReflection: recordReflection,
    getStreak:        getStreak,
    isStreakActive:   isStreakActive,
    getStreakMessage: getStreakMessage
  };

})();
