import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../../models/transaction.dart';
import '../../../models/category.dart';
import '../../../providers/category_provider.dart';
import '../../../providers/transaction_provider.dart';
import 'add_edit_transaction_screen.dart';

class TransactionsScreen extends StatefulWidget {
  const TransactionsScreen({super.key});

  @override
  State<TransactionsScreen> createState() => _TransactionsScreenState();
}

class _TransactionsScreenState extends State<TransactionsScreen> {
  bool _isInitialized = false;
  final _filters = const ['all', 'income', 'expense'];

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_isInitialized) {
      final transactionProvider = Provider.of<TransactionProvider>(context, listen: false);
      final categoryProvider = Provider.of<CategoryProvider>(context, listen: false);
      transactionProvider.fetchTransactions();
      categoryProvider.fetchCategories();
      _isInitialized = true;
    }
  }

  Future<void> _openAddEdit([Transaction? transaction]) async {
    final result = await Navigator.push<bool?>(
      context,
      MaterialPageRoute(
        builder: (_) => AddEditTransactionScreen(transaction: transaction),
      ),
    );
    if (result == true) {
      Provider.of<TransactionProvider>(context, listen: false).fetchTransactions(type: Provider.of<TransactionProvider>(context, listen: false).filter == 'all' ? null : Provider.of<TransactionProvider>(context, listen: false).filter);
    }
  }

  @override
  Widget build(BuildContext context) {
    final transactionProvider = Provider.of<TransactionProvider>(context);
    final categories = Provider.of<CategoryProvider>(context).categories;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Transactions'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _openAddEdit(),
          ),
        ],
      ),
      body: transactionProvider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : transactionProvider.error != null
              ? Center(child: Text(transactionProvider.error!))
              : Column(
                  children: [
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      child: Row(
                        children: _filters.map((filter) {
                          final selected = transactionProvider.filter == filter;
                          return Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: ChoiceChip(
                              label: Text(filter.toUpperCase()),
                              selected: selected,
                              onSelected: (_) => transactionProvider.fetchTransactions(type: filter == 'all' ? null : filter),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                    Expanded(
                      child: transactionProvider.transactions.isEmpty
                          ? const Center(child: Text('No transactions yet. Add one to get started.'))
                          : ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: transactionProvider.transactions.length,
                              itemBuilder: (context, index) {
                                final transaction = transactionProvider.transactions[index];
                                final category = categories.firstWhere(
                                  (category) => category.id == transaction.categoryId,
                                  orElse: () => Category(id: transaction.categoryId, name: transaction.categoryName ?? 'Unknown', type: transaction.type),
                                );
                                return Card(
                                  margin: const EdgeInsets.only(bottom: 16),
                                  child: ListTile(
                                    onTap: () => _openAddEdit(transaction),
                                    onLongPress: () async {
                                      final confirmed = await showDialog<bool>(
                                        context: context,
                                        builder: (context) => AlertDialog(
                                          title: const Text('Delete transaction'),
                                          content: const Text('Are you sure you want to delete this transaction?'),
                                          actions: [
                                            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
                                            TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete')),
                                          ],
                                        ),
                                      );
                                      if (confirmed == true) {
                                        await transactionProvider.deleteTransaction(transaction.id);
                                      }
                                    },
                                    leading: CircleAvatar(
                                      backgroundColor: transaction.type == 'income' ? Colors.green.shade100 : Colors.red.shade100,
                                      child: Icon(
                                        transaction.type == 'income' ? Icons.arrow_downward : Icons.arrow_upward,
                                        color: transaction.type == 'income' ? Colors.green : Colors.red,
                                      ),
                                    ),
                                    title: Text(transaction.description),
                                    subtitle: Text('${category.name} • ${DateFormat.yMMMd().format(transaction.date)}'),
                                    trailing: Column(
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Text(
                                          '₹ ${transaction.amount.toStringAsFixed(2)}',
                                          style: TextStyle(
                                            fontWeight: FontWeight.bold,
                                            color: transaction.type == 'income' ? Colors.green : Colors.red,
                                          ),
                                        ),
                                        if (transaction.receiptUrl != null)
                                          const Padding(
                                            padding: EdgeInsets.only(top: 4),
                                            child: Icon(Icons.receipt_long, size: 18),
                                          ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                    ),
                  ],
                ),
    );
  }
}
