import Webgl from "./scripts/webgl.ts";
import CountDown from "./scripts/CountDown.ts";

const futureDate = CountDown.getFutureDate(12, 25);
console.log(futureDate);
const countDown: CountDown = new CountDown(futureDate, "div.countdown");

const webgl = Webgl.init().then(() => {
  const loaderElm = document.getElementById("loader");
  loaderElm?.classList.add("load_end");
});
