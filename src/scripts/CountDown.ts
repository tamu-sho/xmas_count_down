export default class CountDown {
  date: Date;
  now: Date;
  parentElm: HTMLElement | null;
  childElmList: {
    date: HTMLElement;
    hours: HTMLElement;
    min: HTMLElement;
    sec: HTMLElement;
  };
  timer: number;

  constructor(date: Date, elmSelector: string) {
    this.date = date;
    this.now = new Date();
    this.parentElm = document.querySelector(elmSelector);

    if (this.parentElm === null) {
      console.log(`'${elmSelector}'がありませんでした`);
      return;
    }

    this.childElmList = this.setDateElm(this.parentElm);

    this.startTimer();
  }

  coundDown() {
    const now = new Date();
    if (
      this.date.getFullYear() === now.getFullYear() &&
      this.date.getMonth() === now.getMonth() &&
      this.date.getDay() === now.getDay()
    ) {
      this.displayTime({
        date: 0,
        hours: 0,
        min: 0,
        sec: 0,
      });
      return;
    }
    const timeLimit = this.getTimeLimit(this.date, now);
    this.displayTime({
      date: timeLimit.date,
      hours: timeLimit.hours,
      min: timeLimit.min,
      sec: timeLimit.sec,
    });
  }

  getTimeLimit(
    futureDate: Date,
    nowDate: Date
  ): {
    date: number;
    hours: number;
    min: number;
    sec: number;
  } {
    const timeLimit: number = futureDate.getTime() - nowDate.getTime();
    const sec = Math.floor(timeLimit / 1000) % 60;
    const min = Math.floor(timeLimit / 1000 / 60) % 60;
    const hours = Math.floor(timeLimit / 1000 / 60 / 60) % 24;
    const date = Math.floor(timeLimit / (1000 * 60 * 60 * 24));

    return {
      date,
      hours,
      min,
      sec,
    };
  }

  startTimer() {
    this.timer = setInterval(() => {
      this.coundDown();
    }, 1000);
  }

  clearTimer() {
    clearInterval(this.timer);
  }

  displayTime(val: { date: number; hours: number; min: number; sec: number }) {
    this.childElmList.date.innerHTML = `${("00" + val.date).slice(
      -1 * Math.max(val.date.toString().length, 2)
    )}`;
    this.childElmList.hours.innerHTML = `${("00" + val.hours).slice(-2)}`;
    this.childElmList.min.innerHTML = `${("00" + val.min).slice(-2)}`;
    this.childElmList.sec.innerHTML = `${("00" + val.sec).slice(-2)}`;
  }

  setDateElm(parent: HTMLElement): {
    date: HTMLElement;
    hours: HTMLElement;
    min: HTMLElement;
    sec: HTMLElement;
  } {
    const date = document.createElement("div");
    date.className = "date";

    const hours = document.createElement("div");
    hours.className = "hours";

    const minutes = document.createElement("div");
    minutes.className = "minutes";

    const seconds = document.createElement("div");
    seconds.className = "seconds";

    parent.appendChild(date);
    parent.appendChild(hours);
    parent.appendChild(minutes);
    parent.appendChild(seconds);

    return {
      date: date,
      hours: hours,
      min: minutes,
      sec: seconds,
    };
  }

  // 指定した日付が過ぎている場合は来年の日付を返す関数
  static getFutureDate(month: number, day: number): Date {
    const now: Date = new Date(new Date().toDateString());
    const currentFullYear: number = now.getFullYear();

    const date: Date = new Date(currentFullYear, month - 1, day);

    if (now > date) date.setFullYear(currentFullYear + 1);

    return date;
  }
}
