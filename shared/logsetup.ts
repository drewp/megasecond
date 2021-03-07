import createLogger from "logging";
export default createLogger;

// import { before, diary, Diary } from "diary";
// export default function createLogger(name: string): Diary {
//   console.log('creating', name);
//   const d = diary(name);
//   // before((ev) => {
//   //   ev.message = `[${ev.name}] ` + ev.message;
//   // });
//   d.info("createLogger");
//   return d;
// }
