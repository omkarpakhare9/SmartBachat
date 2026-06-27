class WorkoutDay {
  final int dayNumber;
  final int targetReps;
  final bool pushupsDone;
  final bool situpsDone;
  final bool completed;

  const WorkoutDay({
    required this.dayNumber,
    required this.targetReps,
    required this.pushupsDone,
    required this.situpsDone,
    required this.completed,
  });

  factory WorkoutDay.fromJson(Map<String, dynamic> json) => WorkoutDay(
        dayNumber: json['day_number'] as int,
        targetReps: json['target_reps'] as int,
        pushupsDone: json['pushups_done'] as bool,
        situpsDone: json['situps_done'] as bool,
        completed: json['completed'] as bool,
      );

  WorkoutDay copyWith({
    bool? pushupsDone,
    bool? situpsDone,
    bool? completed,
  }) =>
      WorkoutDay(
        dayNumber: dayNumber,
        targetReps: targetReps,
        pushupsDone: pushupsDone ?? this.pushupsDone,
        situpsDone: situpsDone ?? this.situpsDone,
        completed: completed ?? this.completed,
      );
}
