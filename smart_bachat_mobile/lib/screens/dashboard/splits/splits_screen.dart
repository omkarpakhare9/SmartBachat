import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../providers/split_provider.dart';
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
      appBar: AppBar(
        title: const Text('Split Expenses'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
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
      body: splitProvider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : splitProvider.error != null
              ? Center(child: Text(splitProvider.error!))
              : splitProvider.splits.isEmpty
                  ? const Center(child: Text('No split expenses found'))
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: splitProvider.splits.length,
                      itemBuilder: (context, index) {
                        final split = splitProvider.splits[index];
                        return Card(
                          margin: const EdgeInsets.only(bottom: 16),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Transaction: ${split.transactionId}',
                                  style: Theme.of(context).textTheme.titleMedium,
                                ),
                                const SizedBox(height: 8),
                                Text('Total: ₹ ${split.totalAmount.toStringAsFixed(2)}'),
                                const SizedBox(height: 8),
                                Text('Split type: ${split.splitType}'),
                                const SizedBox(height: 12),
                                const Text('Participants', style: TextStyle(fontWeight: FontWeight.bold)),
                                const SizedBox(height: 8),
                                ...split.participants.map((participant) {
                                  return ListTile(
                                    contentPadding: EdgeInsets.zero,
                                    title: Text(participant.email ?? participant.userId ?? 'Participant'),
                                    subtitle: Text('Share: ₹ ${participant.share.toStringAsFixed(2)}'),
                                    trailing: participant.paid ? const Icon(Icons.check_circle, color: Colors.green) : const Icon(Icons.hourglass_bottom),
                                  );
                                }),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
    );
  }
}
