#保存模型的函数
def save_checkpoint():

#加载模型的函数
def load_checkpoint(checkpoint, model):

# 获取数据loader的函数
# 需要知道数据文件夹的路径，还有batchsize，还有要没有数据变换
def get_loaders(
    train_dir,
    train_maskdir,
    val_dir,
    val_maskdir,
    batch_size,
    train_transform,
    val_transform,
    num_workers=4,
    pin_memory=True,
):

# 训练过程中查看网络的精度
def check_accuracy(loader, model, device = "cuda"):

# 训练过程中保存数据
def save_predictions_as_imgs():
