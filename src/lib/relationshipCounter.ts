export interface RelationshipDuration {
  daysTogether: number;
  monthsAndDaysString: string;
  totalMonths: number;
  days: number;
}

export function getRelationshipDuration(_startDateStr?: string): RelationshipDuration {
  try {
    // Official single source of truth start date as requested
    const officialStart = '2026-07-10';
    const start = new Date(officialStart + 'T00:00:00').getTime();
    const now = Date.now();
    const diffMs = Math.max(0, now - start);
    const daysTogether = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Calendar months and days calculation using exact date arithmetic
    const startDate = new Date(officialStart + 'T00:00:00');
    const currentDate = new Date();

    let years = currentDate.getFullYear() - startDate.getFullYear();
    let months = currentDate.getMonth() - startDate.getMonth();
    let days = currentDate.getDate() - startDate.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    const totalMonths = years * 12 + months;

    let monthsAndDaysString = '';
    if (totalMonths > 0) {
      monthsAndDaysString = `${totalMonths} Month${totalMonths === 1 ? '' : 's'}, ${days} Day${days === 1 ? '' : 's'} Together`;
    } else {
      monthsAndDaysString = `${days} Day${days === 1 ? '' : 's'} Together`;
    }

    return {
      daysTogether,
      monthsAndDaysString,
      totalMonths,
      days,
    };
  } catch (err) {
    console.error("Error calculating relationship duration:", err);
    return {
      daysTogether: 100,
      monthsAndDaysString: '3 Months, 8 Days Together',
      totalMonths: 3,
      days: 8,
    };
  }
}
