import pickle as pickle
import numpy as np
from numpy import genfromtxt
from collections import defaultdict
import torch
import csv
import tabulate


def load_data():
    """加载数据函数，读取用户、物品特征及评分数据"""
    # 加载训练数据
    item_train = genfromtxt('./data/content_item_train.csv', delimiter=',')
    user_train = genfromtxt('./data/content_user_train.csv', delimiter=',')
    y_train    = genfromtxt('./data/content_y_train.csv', delimiter=',')
    
    # 加载特征名称
    with open('./data/content_item_train_header.txt', newline='') as f:
        item_features = list(csv.reader(f))[0]
    with open('./data/content_user_train_header.txt', newline='') as f:
        user_features = list(csv.reader(f))[0]
    
    # 加载物品向量
    item_vecs = genfromtxt('./data/content_item_vecs.csv', delimiter=',')
       
    # 构建电影信息字典
    movie_dict = defaultdict(dict)
    count = 0
    with open('./data/content_movie_list.csv', newline='') as csvfile:
        reader = csv.reader(csvfile, delimiter=',', quotechar='"')
        for line in reader:
            if count == 0: 
                count += 1  # 跳过表头
            else:
                count += 1
                movie_id = int(line[0])  
                movie_dict[movie_id]["title"] = line[1]  
                movie_dict[movie_id]["genres"] = line[2]  

    # 加载用户-类型映射
    with open('./data/content_user_to_genre.pickle', 'rb') as f:
        user_to_genre = pickle.load(f)

    return (item_train, user_train, y_train, item_features, user_features, 
            item_vecs, movie_dict, user_to_genre)


def pprint_train(x_train, features, vs, u_s, maxcount=5, user=True):
    """格式化打印用户或物品训练数据"""
    # 设置浮点数显示格式
    if user:
        flist = [".0f", ".0f", ".1f", 
                 ".1f", ".1f", ".1f", ".1f", ".1f", ".1f", ".1f", ".1f", 
                 ".1f", ".1f", ".1f", ".1f", ".1f", ".1f"]
    else:
        flist = [".0f", ".0f", ".1f", 
                 ".0f", ".0f", ".0f", ".0f", ".0f", ".0f", ".0f", ".0f", 
                 ".0f", ".0f", ".0f", ".0f", ".0f", ".0f"]

    # 构建表头
    head = features[:vs]
    if vs < u_s:
        print("错误：向量起始位置 {vs} 应大于用户起始位置 {u_s}")
    for i in range(u_s):
        head[i] = "[" + head[i] + "]"
    genres = features[vs:]
    hdr = head + genres
    disp = [split_str(hdr, 5)]
    
    # 准备显示数据
    count = 0
    for i in range(x_train.shape[0]):
        if count == maxcount:
            break
        count += 1
        disp.append([ 
            x_train[i, 0].astype(int),  
            x_train[i, 1].astype(int),   
            x_train[i, 2].astype(float), 
            *x_train[i, 3:].astype(float)
        ])
    
    # 生成HTML表格
    table = tabulate.tabulate(
        disp, 
        tablefmt='html',
        headers="firstrow", 
        floatfmt=flist, 
        numalign='center'
    )
    return table


def pprint_data(y_p, user_train, item_train, printfull=False):
    """打印数据预测结果（用于调试）"""
    np.set_printoptions(precision=1)

    for i in range(1000):
        print(f"{y_p[i, 0]: 0.2f}, {y_train[i]: 0.2f}, ", end='') 
        print(f"{user_train[i, 0].astype(int):d}, ",  end='')   # 用户ID
        print(f"{user_train[i, 1].astype(int):d}, ", end=''),  # 评分数量
        print(f"{user_train[i, 2].astype(float): 0.2f}, ",  end='')  # 平均评分
        print(": ", end='')
        print(f"{item_train[i, 0].astype(int):d}, ",  end='')   # 电影ID
        print(f"{item_train[i, 2].astype(float):0.1f}, ", end='')  # 电影平均评分    
        
        if printfull:
            for j in range(8, user_train.shape[1]):
                print(f"{user_train[i, j].astype(float):0.1f}, ", end='')
            print(":", end='')
            for j in range(3, item_train.shape[1]):
                print(f"{item_train[i, j].astype(int):d}, ", end='')
            print()
        else:
            a = user_train[i, uvs:user_train.shape[1]]
            b = item_train[i, ivs:item_train.shape[1]]
            c = np.multiply(a, b)
            print(c)


def split_str(ifeatures, smax):
    """将长字符串分割为较短的子串，便于显示"""
    ofeatures = []
    for s in ifeatures:
        if ' ' not in s:  # 跳过已有空格的字符串
            if len(s) > smax:
                mid = int(len(s) / 2)
                s = s[:mid] + " " + s[mid:]
        ofeatures.append(s)
    return ofeatures


def pprint_data_tab(y_p, user_train, item_train, uvs, ivs, user_features, item_features, maxcount=20, printfull=False):
    """生成格式化的预测结果表格"""
    flist = [".1f", ".1f", ".0f", ".1f", ".0f", ".0f", ".0f",
             ".1f", ".1f", ".1f", ".1f", ".1f", ".1f", ".1f", 
             ".1f", ".1f", ".1f", ".1f", ".1f", ".1f", ".1f"]
    
    # 构建表头
    user_head = user_features[:uvs]
    genres = user_features[uvs:]
    item_head = item_features[:ivs]
    hdr = ["预测评分", "实际评分"] + user_head + item_head + genres
    disp = [split_str(hdr, 5)]
    
    # 准备显示数据
    count = 0
    for i in range(y_p.shape[0]):
        if count == maxcount:
            break
        count += 1
        a = user_train[i, uvs:user_train.shape[1]]
        b = item_train[i, ivs:item_train.shape[1]]
        c = np.multiply(a, b)

        disp.append([ 
            y_p[i, 0], y_train[i], 
            user_train[i, 0].astype(int),   # 用户ID
            user_train[i, 1].astype(int),   # 评分数量
            user_train[i, 2].astype(float), # 用户平均评分
            item_train[i, 0].astype(int),   # 电影ID
            item_train[i, 1].astype(int),   # 年份
            item_train[i, 2].astype(float), # 电影平均评分
            *c
        ])
    
    # 生成HTML表格
    table = tabulate.tabulate(
        disp, 
        tablefmt='html',
        headers="firstrow", 
        floatfmt=flist, 
        numalign='center'
    )
    return table


def print_pred_movies(y_p, user, item, movie_dict, maxcount=10):
    """打印新用户的电影预测结果"""
    count = 0
    movies_listed = defaultdict(int)
    disp = [["预测评分", "电影ID", "平均评分", "标题", "类型"]]

    for i in range(y_p.shape[0]):
        if count == maxcount:
            break
        count += 1
        movie_id = item[i, 0].astype(int)
        if movie_id in movies_listed:
            continue
        movies_listed[movie_id] = 1
        disp.append([
            y_p[i, 0], 
            item[i, 0].astype(int), 
            item[i, 2].astype(float),
            movie_dict[movie_id]['title'], 
            movie_dict[movie_id]['genres']
        ])

    table = tabulate.tabulate(disp, tablefmt='html', headers="firstrow")
    return table


def gen_user_vecs(user_vec, num_items):
    """生成与物品向量维度匹配的用户预测矩阵"""
    user_vecs = np.tile(user_vec, (num_items, 1))
    return user_vecs


def predict_uservec(user_vecs, item_vecs, model, u_s, i_s, scaler, scaler_user, scaler_item, scaledata=False):
    """
    对所有电影进行预测并按预测评分排序
    参数:
        user_vecs: 用户向量
        item_vecs: 物品向量
        model: PyTorch模型
        u_s: 用户特征起始索引
        i_s: 物品特征起始索引
        scaler: 评分缩放器
        scaler_user: 用户特征缩放器
        scaler_item: 物品特征缩放器
        scaledata: 是否需要缩放数据
    返回:
        排序后的索引、预测评分、物品和用户向量
    """
    # 转换为PyTorch张量
    user_torch = torch.tensor(user_vecs[:, u_s:], dtype=torch.float32)
    item_torch = torch.tensor(item_vecs[:, i_s:], dtype=torch.float32)
    
    # 数据缩放（如果需要）
    if scaledata:
        user_torch = torch.tensor(
            scaler_user.transform(user_vecs[:, u_s:]), 
            dtype=torch.float32
        )
        item_torch = torch.tensor(
            scaler_item.transform(item_vecs[:, i_s:]), 
            dtype=torch.float32
        )
    
    # 模型预测（关闭梯度计算以提高效率）
    model.eval()
    with torch.no_grad():
        y_p = model(user_torch, item_torch).numpy()
    
    # 反归一化预测结果
    y_pu = scaler.inverse_transform(y_p)

    if np.any(y_pu < 0):
        print("错误：预测结果出现负值")
    
    # 按预测评分降序排序
    sorted_index = np.argsort(-y_pu, axis=0).reshape(-1).tolist()
    sorted_ypu = y_pu[sorted_index]
    sorted_items = item_vecs[sorted_index]
    sorted_user = user_vecs[sorted_index]
    
    return sorted_index, sorted_ypu, sorted_items, sorted_user


def print_pred_debug(y_p, y, user, item, maxcount=10, onlyrating=False, printfull=False):
    """打印预测调试信息（保留用于调试）"""
    count = 0
    for i in range(y_p.shape[0]):
        if not onlyrating or (onlyrating and y[i, 0] != 0):
            if count == maxcount:
                break
            count += 1
            print(f"{y_p[i, 0]: 0.2f}, {y[i, 0]: 0.2f}, ", end='') 
            print(f"{user[i, 0].astype(int):d}, ",  end='')       # 用户ID
            print(f"{user[i, 1].astype(int):d}, ", end=''),       # 评分数量
            print(f"{user[i, 2].astype(float):0.1f}, ", end=''),  # 平均评分
            print(": ", end='')
            print(f"{item[i, 0].astype(int):d}, ",  end='')       # 电影ID
            print(f"{item[i, 2].astype(float):0.1f}, ", end='')   # 电影平均评分    
            print(": ", end='')
            
            if printfull:
                for j in range(uvs, user.shape[1]):
                    print(f"{user[i, j].astype(float):0.1f}, ", end='')
                print(":", end='')
                for j in range(ivs, item.shape[1]):
                    print(f"{item[i, j].astype(int):d}, ", end='')
                print()
            else:
                a = user[i, uvs:user.shape[1]]
                b = item[i, ivs:item.shape[1]]
                c = np.multiply(a, b)
                print(c)    


def get_user_vecs(user_id, user_train, item_vecs, user_to_genre):
    """
    获取指定用户的向量
    参数:
        user_id: 用户ID
        user_train: 用户训练数据
        item_vecs: 物品向量
        user_to_genre: 用户-类型映射
    返回:
        用户向量矩阵和对应的评分向量
    """
    if user_id not in user_to_genre:
        print("错误：未知用户ID")
        return None
    
    # 查找用户向量
    user_vec_found = False
    for i in range(len(user_train)):
        if user_train[i, 0] == user_id:
            user_vec = user_train[i]
            user_vec_found = True
            break
    if not user_vec_found:
        print("错误：在用户训练数据中未找到该用户ID")
        return None
    
    # 生成与物品数量匹配的用户向量矩阵
    num_items = len(item_vecs)
    user_vecs = np.tile(user_vec, (num_items, 1))

    # 生成评分向量
    y = np.zeros(num_items)
    for i in range(num_items):
        movie_id = item_vecs[i, 0]
        if movie_id in user_to_genre[user_id]['movies']:
            rating = user_to_genre[user_id]['movies'][movie_id]
        else:
            rating = 0
        y[i] = rating
    
    return user_vecs, y


def get_item_genre(item, ivs, item_features):
    """获取物品的类型信息"""
    offset = np.where(item[ivs:] == 1)[0][0]
    genre = item_features[ivs + offset]
    return genre, offset


def print_existing_user(y_p, y, user, items, item_features, ivs, uvs, movie_dict, maxcount=10):
    """打印已有用户的预测结果"""
    count = 0
    movies_listed = defaultdict(int)
    disp = [["预测评分", "实际评分", "用户ID", "用户类型偏好", "电影平均评分", "标题", "类型"]]
    
    for i in range(y.shape[0]):
        if y[i, 0] != 0:  # 只显示用户已评分的电影
            if count == maxcount:
                break
            count += 1
            movie_id = items[i, 0].astype(int)

            # 获取类型信息
            offset = np.where(items[i, ivs:] == 1)[0][0]
            genre_rating = user[i, uvs + offset]
            genre = item_features[ivs + offset]
            
            disp.append([
                y_p[i, 0], 
                y[i, 0],
                user[i, 0].astype(int),      # 用户ID
                genre_rating.astype(float),  # 用户对该类型的偏好
                items[i, 2].astype(float),   # 电影平均评分
                movie_dict[movie_id]['title'], 
                genre
            ])

    table = tabulate.tabulate(
        disp, 
        tablefmt='html', 
        headers="firstrow", 
        floatfmt=[".1f", ".1f", ".0f", ".2f", ".2f"]
    )
    return table