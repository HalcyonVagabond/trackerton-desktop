// src/utils/helpers.js
function timeToString(time) {
    const diffInHrs = time / 3600000;
    const hh = Math.floor(diffInHrs).toString().padStart(2, '0');
  
    const diffInMin = (diffInHrs - hh) * 60;
    const mm = Math.floor(diffInMin).toString().padStart(2, '0');
  
    const diffInSec = Math.floor((diffInMin - mm) * 60).toString().padStart(2, '0');
  
    return `${hh}:${mm}:${diffInSec}`;
  }
  
export {timeToString}