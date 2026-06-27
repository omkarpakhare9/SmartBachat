import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../state/workout_state.dart';

class DailyWorkoutScreen extends StatefulWidget {
  const DailyWorkoutScreen({super.key});

  @override
  State<DailyWorkoutScreen> createState() => _DailyWorkoutScreenState();
}

class _DailyWorkoutScreenState extends State<DailyWorkoutScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<WorkoutState>().load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = context.watch<WorkoutState>();
    final today = state.today;

    return Scaffold(
      appBar: AppBar(title: const Text("Today's Workout")),
      body: RefreshIndicator(
        onRefresh: () => context.read<WorkoutState>().load(),
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            if (state.loading && today == null)
              const Center(child: Padding(
                padding: EdgeInsets.all(40),
                child: CircularProgressIndicator(),
              ))
            else if (state.error != null && today == null)
              _ErrorBox(message: state.error!)
            else if (today != null) ...[
              _StreakHeader(dayNumber: today.dayNumber, reps: today.targetReps),
              const SizedBox(height: 24),
              _ExerciseTile(
                key: const Key('pushups_tile'),
                label: 'Hindu Push-ups',
                reps: today.targetReps,
                done: today.pushupsDone,
                onChanged: (v) =>
                    context.read<WorkoutState>().toggle('pushups', v),
              ),
              const SizedBox(height: 12),
              _ExerciseTile(
                key: const Key('situps_tile'),
                label: 'Sit-ups',
                reps: today.targetReps,
                done: today.situpsDone,
                onChanged: (v) =>
                    context.read<WorkoutState>().toggle('situps', v),
              ),
              const SizedBox(height: 24),
              if (today.completed)
                const _CompletedBanner()
              else
                const _PendingBanner(),
            ],
          ],
        ),
      ),
    );
  }
}

class _StreakHeader extends StatelessWidget {
  const _StreakHeader({required this.dayNumber, required this.reps});

  final int dayNumber;
  final int reps;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Day $dayNumber',
                key: const Key('day_number'),
                style: theme.textTheme.headlineMedium),
            const SizedBox(height: 4),
            Text('$reps reps per exercise',
                key: const Key('target_reps'),
                style: theme.textTheme.titleMedium),
          ],
        ),
      ),
    );
  }
}

class _ExerciseTile extends StatelessWidget {
  const _ExerciseTile({
    super.key,
    required this.label,
    required this.reps,
    required this.done,
    required this.onChanged,
  });

  final String label;
  final int reps;
  final bool done;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: CheckboxListTile(
        value: done,
        onChanged: (v) => onChanged(v ?? false),
        title: Text(label),
        subtitle: Text('$reps reps'),
        controlAffinity: ListTileControlAffinity.leading,
      ),
    );
  }
}

class _CompletedBanner extends StatelessWidget {
  const _CompletedBanner();
  @override
  Widget build(BuildContext context) => Container(
        key: const Key('completed_banner'),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.green.shade100,
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Text(
          'Day complete. Come back tomorrow for +2 reps.',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
      );
}

class _PendingBanner extends StatelessWidget {
  const _PendingBanner();
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.amber.shade100,
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Text('Check off both exercises to complete today.'),
      );
}

class _ErrorBox extends StatelessWidget {
  const _ErrorBox({required this.message});
  final String message;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.all(24),
        child: Text('Error: $message',
            style: const TextStyle(color: Colors.red)),
      );
}
