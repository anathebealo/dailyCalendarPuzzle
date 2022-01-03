const weekdays = {
  sunday: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday'
};

const months = {
  january: 'January',
  february: 'February',
  march: 'March',
  april: 'April',
  may: 'May',
  june: 'June',
  july: 'July',
  august: 'August',
  september: 'September',
  october: 'October',
  november: 'November',
  december: 'December'
};

function solvePuzzle(){
	let day = document.getElementById('day_input').value; 
	let month = document.getElementById('month_input').value;
  let weekday = document.getElementById('weekday_input').value;

  // give accurate number based on days of the month
  if(!isDayMonthAndWeekdayCorrect(day, month, weekday)) {
    return;
  }

  console.log(weekday, month, day);
  document.getElementById("puzzleContainer").innerHTML = "<table id='board'> </table>";
};

function isDayMonthAndWeekdayCorrect(day, month, weekday) {
  let isDateCorrect = true;
  // give accurate number based on days of the month
  if(day > 31) {
    alert('Max days per month is 31');
    isDateCorrect = false;
  } else if(month === months.february && day > 28) {
    alert('Februray only has 28 days in it on non-leap years. This app only works for 2022');
    isDateCorrect = false;
  } else if(day < 1) {
    alert('Day must be greater than 0');
    isDateCorrect = false;
  } else if([months.september, months.april, months.june, months.november].includes(month) && day > 30) {
    alert(`${month} only has 30 days in it.`);
    isDateCorrect = false;
  }

  return isDateCorrect;
}