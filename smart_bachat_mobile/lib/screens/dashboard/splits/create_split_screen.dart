import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../providers/split_provider.dart';
import '../../../providers/transaction_provider.dart';

class CreateSplitScreen extends StatefulWidget {
  const CreateSplitScreen({super.key});

  @override
  State<CreateSplitScreen> createState() => _CreateSplitScreenState();
}

class _CreateSplitScreenState extends State<CreateSplitScreen> {
  final _formKey = GlobalKey<FormState>();
  String _splitType = 'equal';
  final _notesController = TextEditingController();
  final _participantEmailController = TextEditingController();
  final _shareController = TextEditingController();
  String? _selectedTransactionId;
  final List<Map<String, dynamic>> _participants = [];
  bool _isInitialized = false;

  @override
  void dispose() {
    _notesController.dispose();
    _participantEmailController.dispose();
    _shareController.dispose();
    super.dispose();
  }

  void _addParticipant() {
    if (_participantEmailController.text.isEmpty) return;
    final participant = {
      'email': _participantEmailController.text.trim(),
      'share': _splitType == 'custom' ? double.tryParse(_shareController.text) ?? 0 : null,
      'percentage': _splitType == 'percentage' ? double.tryParse(_shareController.text) ?? 0 : null,
    };
    setState(() {
      _participants.add(participant);
      _participantEmailController.clear();
      _shareController.clear();
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate() || _selectedTransactionId == null || _participants.isEmpty) {
      return;
    }
    final splitProvider = Provider.of<SplitProvider>(context, listen: false);
    final payloadParticipants = _participants.map((participant) {
      final data = <String, dynamic>{
        'user': participant['email'],
      };
      if (_splitType == 'percentage') {
        data['percentage'] = participant['percentage'];
      } else if (_splitType == 'custom') {
        data['share'] = participant['share'];
      }
      return data;
    }).toList();

    final success = await splitProvider.createSplit(
      transactionId: _selectedTransactionId!,
      splitType: _splitType,
      notes: _notesController.text.trim(),
      participants: payloadParticipants,
    );

    if (success && mounted) {
      Navigator.pop(context, true);
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_isInitialized) {
      final transactionProvider = Provider.of<TransactionProvider>(context, listen: false);
      transactionProvider.fetchTransactions(type: 'expense');
      _isInitialized = true;
    }
  }

  @override
  Widget build(BuildContext context) {
    final transactionProvider = Provider.of<TransactionProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Split'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              DropdownButtonFormField<String>(
                value: _selectedTransactionId,
                decoration: InputDecoration(
                  labelText: 'Transaction',
                  border: const OutlineInputBorder(),
                  helperText: transactionProvider.isLoading
                      ? 'Loading transactions...'
                      : (transactionProvider.transactions.isEmpty
                          ? (transactionProvider.error ??
                              'No expense transactions yet. Add one from the Transactions tab first.')
                          : null),
                  helperStyle: TextStyle(
                    color: transactionProvider.transactions.isEmpty &&
                            !transactionProvider.isLoading
                        ? Colors.red
                        : null,
                  ),
                ),
                items: transactionProvider.transactions
                    .map((transaction) => DropdownMenuItem(
                          value: transaction.id,
                          child: Text('${transaction.description} - ₹ ${transaction.amount.toStringAsFixed(2)}'),
                        ))
                    .toList(),
                onChanged: transactionProvider.transactions.isEmpty
                    ? null
                    : (value) => setState(() => _selectedTransactionId = value),
                validator: (value) => value == null ? 'Select a transaction' : null,
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _splitType,
                      decoration: const InputDecoration(
                        labelText: 'Split type',
                        border: OutlineInputBorder(),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'equal', child: Text('Equal')),
                        DropdownMenuItem(value: 'percentage', child: Text('Percentage')),
                        DropdownMenuItem(value: 'custom', child: Text('Custom')),
                      ],
                      onChanged: (value) {
                        if (value != null) {
                          setState(() {
                            _splitType = value;
                          });
                        }
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _notesController,
                decoration: const InputDecoration(
                  labelText: 'Notes',
                  border: OutlineInputBorder(),
                ),
                minLines: 1,
                maxLines: 3,
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _participantEmailController,
                      decoration: const InputDecoration(
                        labelText: 'Participant email',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _shareController,
                      decoration: InputDecoration(
                        labelText: _splitType == 'percentage' ? 'Percentage' : _splitType == 'custom' ? 'Share' : 'Share',
                        border: const OutlineInputBorder(),
                      ),
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      validator: (value) {
                        if (_splitType != 'equal' && (value == null || value.isEmpty)) {
                          return 'Required';
                        }
                        return null;
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton(
                    onPressed: _addParticipant,
                    child: const Text('Add'),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Expanded(
                child: ListView.builder(
                  itemCount: _participants.length,
                  itemBuilder: (context, index) {
                    final participant = _participants[index];
                    return ListTile(
                      title: Text(participant['email'] ?? 'Participant'),
                      subtitle: Text(_splitType == 'percentage'
                          ? 'Percentage: ${participant['percentage'] ?? 0}%'
                          : 'Share: ₹ ${participant['share']?.toStringAsFixed(2) ?? '0.00'}'),
                      trailing: IconButton(
                        icon: const Icon(Icons.delete_outline),
                        onPressed: () {
                          setState(() {
                            _participants.removeAt(index);
                          });
                        },
                      ),
                    );
                  },
                ),
              ),
              ElevatedButton(
                onPressed: transactionProvider.isLoading ? null : _submit,
                child: transactionProvider.isLoading
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Create Split'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
