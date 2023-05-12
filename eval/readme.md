评分脚本参数说明（以task1为例）：
python eval/task1_eval.py \
    --prediction_path ./data/model/task1/test_prediction.jsonl \
    --answer_path ./data/input/task1/task1_test.jsonl \
    --prediction_level strict

其中"eval/task1_examine.py" 为评分脚本的绝对或相对路径
"--prediction_path" 后为模型预测结果的绝对或相对路径
"--answer_path" 后为标准答案的绝对或相对路径
"--prediction_level" （仅task1任务中包含）为评分方式，"strict"对应角色识别准确性指标（排名指标），逐角色计算相似度。"loose"对应文本识别准确性指标（参考指标），计算元组整体相似度。

注意：评分脚本的参数需与task对应。
