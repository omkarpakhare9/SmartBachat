/// Daily rep progression — mirror of the backend algorithm.
/// Day 1 = 9 reps, +2 each consecutive day.
const int kStartReps = 9;
const int kIncrement = 2;

int repsForDay(int dayNumber) {
  if (dayNumber < 1) {
    throw ArgumentError('dayNumber must be >= 1');
  }
  return kStartReps + kIncrement * (dayNumber - 1);
}

int requiredDayFor({
  required DateTime today,
  required DateTime? lastCompleted,
  required int currentDay,
}) {
  if (lastCompleted == null) {
    return currentDay == 0 ? 1 : currentDay;
  }
  final t = DateTime(today.year, today.month, today.day);
  final l = DateTime(lastCompleted.year, lastCompleted.month, lastCompleted.day);
  if (t.isAtSameMomentAs(l)) return currentDay;
  final gap = t.difference(l).inDays;
  if (gap == 1) return currentDay + 1;
  return 1;
}
