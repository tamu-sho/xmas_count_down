import "./scripts/webgl.ts";
import CountDown from "./scripts/CountDown.ts";

const futureDate = CountDown.getFutureDate(12, 25);
const countDown: CountDown = new CountDown(futureDate, "div.countdown");

setTimeout(() => {
  const loaderElm = document.getElementById("loader");
  loaderElm?.classList.add("load_end");
}, 1200);
