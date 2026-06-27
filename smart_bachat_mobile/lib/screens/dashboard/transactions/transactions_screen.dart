import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../../models/transaction.dart';
import '../../../models/category.dart';
import '../../../providers/category_provider.dart';
import '../../../providers/transaction_provider.dart';
import '../../../theme/app_theme.dart';
import '../../../widgets/money_decorations.dart';
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
      appBar: GradientAppBar(
        title: 'Transactions',
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle, color: Colors.white, size: 28),
            onPressed: () => _openAddEdit(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.accentDark,
        foregroundColor: const Color(0xFF7C2D12),
        icon: const Icon(Icons.add),
        label: const Text('New',
            style: TextStyle(fontWeight: FontWeight.w800)),
        onPressed: () => _openAddEdit(),
      ),
      body: MoneyBackground(
        showCoins: false,
        child: transactionProvider.isLoading
            ? const Center(child: CircularProgressIndicator())
            : transactionProvider.error != null
                ? Center(child: Text(transactionProvider.error!))
                : Column(
                    children: [
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 14),
                        child: Row(
                          children: _filters.map((filter) {
                            final selected =
                                transactionProvider.filter == filter;
                            return Padding(
                              padding: const EdgeInsets.only(right: 10),
                              child: ChoiceChip(
                                label: Text(filter.toUpperCase()),
                                selected: selected,
                                onSelected: (_) => transactionProvider
                                    .fetchTransactions(
                                        type: filter == 'all' ? null : filter),
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                      Expanded(
                        child: transactionProvider.transactions.isEmpty
                            ? Center(
                                child: Padding(
                                  padding: const EdgeInsets.all(32),
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: const [
                                      CashBillIllustration(size: 160),
                                      SizedBox(height: 12),
                                      Text(
                                        'No transactions yet.\nAdd one to get started.',
                                        textAlign: TextAlign.center,
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
                                padding:
                                    const EdgeInsets.fromLTRB(16, 4, 16, 90),
                                itemCount:
                                    transactionProvider.transactions.length,
                                itemBuilder: (context, index) {
                                  final transaction =
                                      transactionProvider.transactions[index];
                                  final category = categories.firstWhere(
                                    (category) =>
                                        category.id == transaction.categoryId,
                                    orElse: () => Category(
                                        id: transaction.categoryId,
                                        name: transaction.categoryName ??
                                            'Unknown',
                                        type: transaction.type),
                                  );
                                  final isIncome =
                                      transaction.type == 'income';
                                  return Container(
                                    margin: const EdgeInsets.only(bottom: 12),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(16),
                                      boxShadow: [
                                        BoxShadow(
                                          color:
                                              Colors.black.withOpacity(0.05),
                                          blurRadius: 10,
                                          offset: const Offset(0, 4),
                                        ),
                                      ],
                                    ),
                                    child: ListTile(
                                      contentPadding:
                                          const EdgeInsets.symmetric(
                                              horizontal: 14, vertical: 6),
                                      onTap: () => _openAddEdit(transaction),
                                      onLongPress: () async {
                                        final confirmed =
                                            await showDialog<bool>(
                                          context: context,
                                          builder: (context) => AlertDialog(
                                            title: const Text(
                                                'Delete transaction'),
                                            content: const Text(
                                                'Are you sure you want to delete this transaction?'),
                                            actions: [
                                              TextButton(
                                                  onPressed: () =>
                                                      Navigator.pop(
                                                          context, false),
                                                  child: const Text('Cancel')),
                                              TextButton(
                                                  onPressed: () =>
                                                      Navigator.pop(
                                                          context, true),
                                                  child: const Text('Delete')),
                                            ],
                                          ),
                                        );
                                        if (confirmed == true) {
                                          await transactionProvider
                                              .deleteTransaction(
                                                  transaction.id);
                                        }
                                      },
                                      leading: Container(
                                        width: 46,
                                        height: 46,
                                        decoration: BoxDecoration(
                                          gradient: isIncome
                                              ? AppColors.incomeGradient
                                              : AppColors.expenseGradient,
                                          borderRadius:
                                              BorderRadius.circular(14),
                                        ),
                                        child: Icon(
                                          isIncome
                                              ? Icons.arrow_downward
                                              : Icons.arrow_upward,
                                          color: Colors.white,
                                        ),
                                      ),
                                      title: Text(
                                        transaction.description,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                      subtitle: Text(
                                          '${category.name} • ${DateFormat.yMMMd().format(transaction.date)}'),
                                      trailing: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.end,
                                        mainAxisAlignment:
                                            MainAxisAlignment.center,
                                        children: [
                                          Text(
                                            '${isIncome ? '+' : '-'}₹${transaction.amount.toStringAsFixed(2)}',
                                            style: TextStyle(
                                              fontWeight: FontWeight.w900,
                                              color: isIncome
                                                  ? AppColors.primary
                                                  : AppColors.rose,
                                            ),
                                          ),
                                          if (transaction.receiptUrl != null)
                                            const Padding(
                                              padding:
                                                  EdgeInsets.only(top: 4),
                                              child: Icon(Icons.receipt_long,
                                                  size: 16,
                                                  color: AppColors.accentDark),
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
      ),
    );
  }
}
