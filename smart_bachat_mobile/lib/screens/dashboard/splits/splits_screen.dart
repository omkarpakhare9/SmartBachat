import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../providers/split_provider.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/money_decorations.dart';
import 'create_split_screen.dart';

class SplitsScreen extends StatefulWidget {
  const SplitsScreen({super.key});

  @override
  State<SplitsScreen> createState() => _SplitsScreenState();
}

class _SplitsScreenState extends State<SplitsScreen> {
  bool _isInitialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_isInitialized) {
      final splitProvider = Provider.of<SplitProvider>(context, listen: false);
      splitProvider.fetchSplits();
      _isInitialized = true;
    }
  }

  @override
  Widget build(BuildContext context) {
    final splitProvider = Provider.of<SplitProvider>(context);

    return Scaffold(
      appBar: GradientAppBar(
        title: 'Split Expenses',
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle, color: Colors.white, size: 28),
            onPressed: () async {
              final created = await Navigator.push<bool?>(
                context,
                MaterialPageRoute(builder: (_) => const CreateSplitScreen()),
              );
              if (created == true) {
                splitProvider.fetchSplits();
              }
            },
          ),
        ],
      ),
      body: MoneyBackground(
        showCoins: false,
        child: splitProvider.isLoading
            ? const Center(child: CircularProgressIndicator())
            : splitProvider.error != null
                ? Center(child: Text(splitProvider.error!))
                : splitProvider.splits.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(28.0),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: const [
                              Icon(Icons.groups,
                                  size: 80, color: AppColors.violet),
                              SizedBox(height: 12),
                              Text(
                                'No split expenses yet.',
                                style: TextStyle(
                                  color: AppColors.textSecondary,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                        itemCount: splitProvider.splits.length,
                        itemBuilder: (context, index) {
                          final split = splitProvider.splits[index];
                          return Container(
                            margin: const EdgeInsets.only(bottom: 14),
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(20),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.05),
                                  blurRadius: 10,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      width: 42,
                                      height: 42,
                                      decoration: BoxDecoration(
                                        gradient: const LinearGradient(
                                          colors: [
                                            Color(0xFFA78BFA),
                                            Color(0xFF7C3AED),
                                          ],
                                        ),
                                        borderRadius:
                                            BorderRadius.circular(12),
                                      ),
                                      child: const Icon(Icons.groups,
                                          color: Colors.white),
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Text(
                                        'Split ${split.splitType.toUpperCase()}',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                    ),
                                    Text(
                                      '₹ ${split.totalAmount.toStringAsFixed(2)}',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w900,
                                        color: AppColors.primary,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 10),
                                const Text('Participants',
                                    style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.textSecondary)),
                                const SizedBox(height: 6),
                                ...split.participants.map((participant) {
                                  return ListTile(
                                    dense: true,
                                    contentPadding: EdgeInsets.zero,
                                    leading: CircleAvatar(
                                      radius: 16,
                                      backgroundColor: participant.paid
                                          ? AppColors.primary
                                          : AppColors.accent,
                                      child: Icon(
                                        participant.paid
                                            ? Icons.check
                                            : Icons.hourglass_top,
                                        color: Colors.white,
                                        size: 16,
                                      ),
                                    ),
                                    title: Text(participant.email ??
                                        participant.userId ??
                                        'Participant'),
                                    subtitle: Text(
                                        'Share: ₹ ${participant.share.toStringAsFixed(2)}'),
                                  );
                                }),
                              ],
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}
