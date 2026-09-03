# Hyperparameters 定义超参数，
Learning rate
Batch size
Image dir
Val dir
Number of epoch
Image height
Image width
…

# 定义训练函数， for循环loader，获取数据，forward， backward
def train_fn(loader, model, optimizer, loss_fn, scaler)
	for batch_idx, (data, targets) in enumerate(loop):

# 主函数
def main()
	train_transform
	val_transforms
	# 定义模型
	model = UNET(in_channels=3, out_channels=1).to(DEVICE)
	# loss函数
	# 优化器
	
	# 定义好数据的loader
	train_loader, val_loader = get_loaders()
	
	# 开始一个个epoch循环
	for epoch in range(NUM_EPOCHS):
		# 把上面四个东西，给训练函数，开始训练
		Train_fn()
		
		# 保存模型
		Save_checkpoint()
		
		#检查精度。 需要一个model和测试数据的loader
		check_accuracy(loader, model, device = "cuda"):