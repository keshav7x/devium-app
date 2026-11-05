type BuildReporter = {
  info(message: string): void;
};

let current: BuildReporter | null = null;

export function setReporter(reporter: BuildReporter | null): void {
  current = reporter;
}

export function report(message: string): void {
  if (current) {
    current.info(message);
    return;
  }
  console.log(message);
}
